# Transliteration API Documentation

Complete guide for using the Transliteration API in your Expo mobile app.

## Table of Contents

- [Overview](#overview)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Expo Implementation Guide](#expo-implementation-guide)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Complete Example](#complete-example)

## Overview

The Transliteration API provides secure endpoints for converting text between English (Roman script) and Hindi (Devanagari script) while preserving pronunciation.

**Key Features:**
- Anonymous JWT-based authentication (device-based)
- Rate limiting: 20 requests per minute per IP
- Token expiry: 24 hours
- Isolated from e-commerce authentication system

**Base URL**: `https://your-api-domain.com/api/transliteration` (or `http://localhost:5000/api/transliteration` for development)

---

## Authentication Flow

### Step 1: Get Anonymous Token

Before using transliteration endpoints, you need to obtain an anonymous JWT token.

**Endpoint**: `POST /api/transliteration/auth/anonymous`

**Request:**
```json
{
  "deviceId": "unique-device-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

**Notes:**
- `deviceId` must be 8-128 characters
- Token is valid for 24 hours
- Store the token securely in your app (AsyncStorage/SecureStore)
- Request a new token when it expires

---

## API Endpoints

### 1. English to Hindi Transliteration

**Endpoint**: `POST /api/transliteration/en-hi`

**Headers:**
```
Authorization: Bearer <your-transliteration-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "Hello, how are you?"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "originalText": "Hello, how are you?",
    "translatedText": "हेलो, हाउ आर यू?",
    "sourceLanguage": "en",
    "targetLanguage": "hi"
  }
}
```

### 2. Hindi to English Transliteration

**Endpoint**: `POST /api/transliteration/hi-en`

**Headers:**
```
Authorization: Bearer <your-transliteration-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "नमस्ते, आप कैसे हैं?"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "originalText": "नमस्ते, आप कैसे हैं?",
    "translatedText": "Namaste, aap kaise hain?",
    "sourceLanguage": "hi",
    "targetLanguage": "en"
  }
}
```

---

## Expo Implementation Guide

### Step 1: Install Dependencies

```bash
npx expo install expo-secure-store
# or for AsyncStorage
npx expo install @react-native-async-storage/async-storage
```

### Step 2: Create API Service File

Create `services/transliterationApi.ts`:

```typescript
import * as SecureStore from 'expo-secure-store';
// OR import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-api-domain.com/api/transliteration';
// For development: 'http://localhost:5000/api/transliteration'
// For Expo: 'http://YOUR_LOCAL_IP:5000/api/transliteration'

const TOKEN_KEY = 'transliteration_token';
const TOKEN_EXPIRY_KEY = 'transliteration_token_expiry';
const DEVICE_ID_KEY = 'device_id';

// Get or create device ID
export const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate a unique device ID
      const { v4: uuidv4 } = require('uuid');
      deviceId = uuidv4();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to a simple ID if SecureStore fails
    return `device-${Date.now()}`;
  }
};

// Get stored token
export const getStoredToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) {
      return null;
    }
    
    // Check if token is expired
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() >= expiryTime) {
      // Token expired, remove it
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
};

// Store token with expiry
export const storeToken = async (token: string, expiresIn: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    
    // Calculate expiry time (24h = 86400000 ms)
    const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

// Get anonymous token from API
export const getAnonymousToken = async (): Promise<string> => {
  try {
    const deviceId = await getDeviceId();
    
    const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get token');
    }
    
    const data = await response.json();
    
    if (data.success && data.token) {
      await storeToken(data.token, data.expiresIn);
      return data.token;
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('Error getting anonymous token:', error);
    throw error;
  }
};

// Ensure we have a valid token (get from storage or fetch new one)
export const ensureValidToken = async (): Promise<string> => {
  let token = await getStoredToken();
  
  if (!token) {
    token = await getAnonymousToken();
  }
  
  return token;
};

// Transliterate English to Hindi
export const transliterateEnglishToHindi = async (
  text: string
): Promise<string> => {
  try {
    const token = await ensureValidToken();
    
    const response = await fetch(`${API_BASE_URL}/en-hi`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      // If 401, token might be expired, try getting a new one
      if (response.status === 401) {
        const newToken = await getAnonymousToken();
        // Retry with new token
        const retryResponse = await fetch(`${API_BASE_URL}/en-hi`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });
        
        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.message || 'Transliteration failed');
        }
        
        const retryData = await retryResponse.json();
        return retryData.data.translatedText;
      }
      
      const error = await response.json();
      throw new Error(error.message || 'Transliteration failed');
    }
    
    const data = await response.json();
    return data.data.translatedText;
  } catch (error) {
    console.error('Error transliterating English to Hindi:', error);
    throw error;
  }
};

// Transliterate Hindi to English
export const transliterateHindiToEnglish = async (
  text: string
): Promise<string> => {
  try {
    const token = await ensureValidToken();
    
    const response = await fetch(`${API_BASE_URL}/hi-en`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      // If 401, token might be expired, try getting a new one
      if (response.status === 401) {
        const newToken = await getAnonymousToken();
        // Retry with new token
        const retryResponse = await fetch(`${API_BASE_URL}/hi-en`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });
        
        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.message || 'Transliteration failed');
        }
        
        const retryData = await retryResponse.json();
        return retryData.data.translatedText;
      }
      
      const error = await response.json();
      throw new Error(error.message || 'Transliteration failed');
    }
    
    const data = await response.json();
    return data.data.translatedText;
  } catch (error) {
    console.error('Error transliterating Hindi to English:', error);
    throw error;
  }
};
```

### Step 3: Install UUID for Device ID (Optional)

```bash
npm install uuid
npm install --save-dev @types/uuid
```

### Step 4: Create React Hook (Optional but Recommended)

Create `hooks/useTransliteration.ts`:

```typescript
import { useState, useCallback } from 'react';
import {
  transliterateEnglishToHindi,
  transliterateHindiToEnglish,
} from '../services/transliterationApi';

interface UseTransliterationReturn {
  transliterateEnToHi: (text: string) => Promise<string>;
  transliterateHiToEn: (text: string) => Promise<string>;
  loading: boolean;
  error: string | null;
}

export const useTransliteration = (): UseTransliterationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transliterateEnToHi = useCallback(async (text: string): Promise<string> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await transliterateEnglishToHindi(text);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transliteration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const transliterateHiToEn = useCallback(async (text: string): Promise<string> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await transliterateHindiToEnglish(text);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transliteration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    transliterateEnToHi,
    transliterateHiToEn,
    loading,
    error,
  };
};
```

### Step 5: Use in Your Component

```typescript
import React, { useState } from 'react';
import { View, TextInput, Button, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTransliteration } from '../hooks/useTransliteration';

export default function TransliterationScreen() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [direction, setDirection] = useState<'en-hi' | 'hi-en'>('en-hi');
  
  const { transliterateEnToHi, transliterateHiToEn, loading, error } = useTransliteration();

  const handleTransliterate = async () => {
    try {
      let result: string;
      
      if (direction === 'en-hi') {
        result = await transliterateEnToHi(inputText);
      } else {
        result = await transliterateHiToEn(inputText);
      }
      
      setOutputText(result);
    } catch (err) {
      console.error('Transliteration error:', err);
      // Error is already set in the hook
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transliteration</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title="English → Hindi"
          onPress={() => setDirection('en-hi')}
          color={direction === 'en-hi' ? '#007AFF' : '#CCCCCC'}
        />
        <Button
          title="Hindi → English"
          onPress={() => setDirection('hi-en')}
          color={direction === 'hi-en' ? '#007AFF' : '#CCCCCC'}
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder={direction === 'en-hi' ? 'Enter English text' : 'Enter Hindi text'}
        value={inputText}
        onChangeText={setInputText}
        multiline
        numberOfLines={4}
      />

      <Button
        title={loading ? 'Transliterating...' : 'Transliterate'}
        onPress={handleTransliterate}
        disabled={loading || !inputText.trim()}
      />

      {loading && <ActivityIndicator style={styles.loader} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {outputText ? (
        <View style={styles.outputContainer}>
          <Text style={styles.outputLabel}>Result:</Text>
          <Text style={styles.outputText}>{outputText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  loader: {
    marginTop: 16,
  },
  error: {
    color: 'red',
    marginTop: 16,
    textAlign: 'center',
  },
  outputContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  outputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  outputText: {
    fontSize: 18,
    lineHeight: 24,
  },
});
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Text field is required"
}
```
**Solution**: Ensure the `text` field is provided and non-empty.

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Transliteration authentication required"
}
```
**Solution**: 
- Token is missing or expired
- Get a new token using `/api/transliteration/auth/anonymous`
- Ensure token is sent in `Authorization: Bearer <token>` header

#### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Too many transliteration requests. Please try again later."
}
```
**Solution**: 
- Rate limit is 20 requests per minute per IP
- Wait 1 minute before retrying
- Implement request queuing in your app

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Transliteration failed: <error details>"
}
```
**Solution**: 
- Server-side error
- Retry after a short delay
- Check server logs if issue persists

### Error Handling Example

```typescript
const handleTransliterate = async (text: string) => {
  try {
    const result = await transliterateEnglishToHindi(text);
    return { success: true, data: result };
  } catch (error: any) {
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      // Token expired, try refreshing
      try {
        const newToken = await getAnonymousToken();
        const result = await transliterateEnglishToHindi(text);
        return { success: true, data: result };
      } catch (retryError) {
        return { success: false, error: 'Authentication failed. Please try again.' };
      }
    } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      return { success: false, error: 'Too many requests. Please wait a moment.' };
    } else if (error.message?.includes('400')) {
      return { success: false, error: 'Invalid input. Please check your text.' };
    } else {
      return { success: false, error: 'Transliteration failed. Please try again.' };
    }
  }
};
```

---

## Best Practices

### 1. Token Management
- **Store tokens securely**: Use `expo-secure-store` for sensitive data
- **Check expiry**: Verify token hasn't expired before making requests
- **Auto-refresh**: Automatically get a new token when expired
- **Cache device ID**: Generate once and reuse

### 2. Network Handling
- **Handle offline**: Check network connectivity before making requests
- **Retry logic**: Implement exponential backoff for failed requests
- **Timeout**: Set reasonable timeouts (10-30 seconds)

### 3. User Experience
- **Loading states**: Show loading indicators during API calls
- **Error messages**: Display user-friendly error messages
- **Debounce input**: Wait for user to stop typing before transliterating
- **Cache results**: Store recent transliterations locally

### 4. Performance
- **Batch requests**: Avoid making multiple simultaneous requests
- **Rate limiting**: Respect the 20 requests/minute limit
- **Text length**: Keep text under 1000 characters for better performance

### 5. Security
- **Never log tokens**: Don't log or expose tokens in console
- **HTTPS only**: Always use HTTPS in production
- **Validate input**: Sanitize user input before sending

---

## Complete Example with All Features

```typescript
// services/transliterationApi.ts (Complete version with all features)

import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:5000/api/transliteration'
  : 'https://your-api-domain.com/api/transliteration';

const TOKEN_KEY = 'transliteration_token';
const TOKEN_EXPIRY_KEY = 'transliteration_token_expiry';
const DEVICE_ID_KEY = 'device_id';
const CACHE_KEY_PREFIX = 'translit_cache_';

// Network check
const checkNetwork = async (): Promise<boolean> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected && networkState.isInternetReachable;
  } catch {
    return false;
  }
};

// Get device ID
export const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = uuidv4();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return `device-${Date.now()}`;
  }
};

// Get stored token
export const getStoredToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() >= expiryTime) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      return null;
    }
    
    return token;
  } catch {
    return null;
  }
};

// Store token
export const storeToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    const expiryTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

// Get anonymous token
export const getAnonymousToken = async (): Promise<string> => {
  const isOnline = await checkNetwork();
  if (!isOnline) {
    throw new Error('No internet connection');
  }

  const deviceId = await getDeviceId();
  
  const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get token');
  }
  
  const data = await response.json();
  if (data.success && data.token) {
    await storeToken(data.token);
    return data.token;
  }
  
  throw new Error('Invalid response from server');
};

// Ensure valid token
export const ensureValidToken = async (): Promise<string> => {
  let token = await getStoredToken();
  if (!token) {
    token = await getAnonymousToken();
  }
  return token;
};

// Cache result
const cacheResult = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(`${CACHE_KEY_PREFIX}${key}`, value);
  } catch (error) {
    console.error('Error caching result:', error);
  }
};

// Get cached result
const getCachedResult = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(`${CACHE_KEY_PREFIX}${key}`);
  } catch {
    return null;
  }
};

// Create cache key
const createCacheKey = (text: string, direction: string): string => {
  return `${direction}_${text.substring(0, 50)}`;
};

// Transliterate with retry and cache
export const transliterate = async (
  text: string,
  direction: 'en-hi' | 'hi-en'
): Promise<string> => {
  // Check cache first
  const cacheKey = createCacheKey(text, direction);
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  // Check network
  const isOnline = await checkNetwork();
  if (!isOnline) {
    throw new Error('No internet connection');
  }

  const endpoint = direction === 'en-hi' ? '/en-hi' : '/hi-en';
  let token = await ensureValidToken();

  const makeRequest = async (authToken: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (response.status === 401) {
      // Token expired, get new one and retry
      const newToken = await getAnonymousToken();
      return makeRequest(newToken);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Transliteration failed');
    }

    const data = await response.json();
    const result = data.data.translatedText;

    // Cache the result
    await cacheResult(cacheKey, result);

    return result;
  };

  return makeRequest(token);
};

// Convenience functions
export const transliterateEnglishToHindi = (text: string) =>
  transliterate(text, 'en-hi');

export const transliterateHindiToEnglish = (text: string) =>
  transliterate(text, 'hi-en');
```

---

## Testing in Expo

### For Local Development

1. **Find your local IP address:**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. **Update API_BASE_URL:**
   ```typescript
   const API_BASE_URL = 'http://192.168.1.100:5000/api/transliteration';
   ```

3. **Ensure your phone and computer are on the same network**

4. **Test the connection:**
   ```typescript
   // Test endpoint
   const testConnection = async () => {
     try {
       const response = await fetch('http://YOUR_IP:5000/health');
       const data = await response.json();
       console.log('Connection test:', data);
     } catch (error) {
       console.error('Connection failed:', error);
     }
   };
   ```

---

## Summary

1. **Get token**: Call `/api/transliteration/auth/anonymous` with deviceId
2. **Store token**: Save token securely with expiry time
3. **Use token**: Include in `Authorization: Bearer <token>` header
4. **Handle errors**: Implement retry logic for 401 errors
5. **Respect limits**: Stay within 20 requests/minute
6. **Cache results**: Store recent transliterations locally
7. **Check network**: Verify connectivity before making requests

The API is now ready to use in your Expo app! 🚀
