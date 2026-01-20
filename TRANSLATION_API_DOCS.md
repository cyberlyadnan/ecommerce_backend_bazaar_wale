# Transliteration API Documentation

This document describes the Transliteration API endpoints for converting text between English (Roman script) and Hindi (Devanagari script) using OpenAI's GPT-4o-mini model.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [English to Hindi Transliteration](#english-to-hindi-transliteration)
  - [Hindi to English Transliteration](#hindi-to-english-transliteration)
- [Error Responses](#error-responses)
- [Examples](#examples)

## Overview

The Transliteration API provides two endpoints for bidirectional script conversion between English and Hindi:
- **English to Hindi**: Transliterates English text (Roman script) to Hindi (Devanagari script) - preserves pronunciation
- **Hindi to English**: Transliterates Hindi text (Devanagari script) to English (Roman script) - preserves pronunciation

**Important**: This API performs **transliteration** (script conversion while preserving pronunciation), NOT translation (meaning conversion). For example:
- Transliteration: "Hello" → "हेलो" (same sound, different script)
- Translation: "Hello" → "नमस्ते" (different meaning)

Both endpoints use OpenAI's GPT-4o-mini model for accurate transliterations.

**Base URL**: `http://localhost:5000/api/translation` (or your production API URL)

## Authentication

All transliteration endpoints require authentication using a secure API token. The token must be provided in one of the following ways:

### Option 1: Authorization Header (Recommended)
```
Authorization: Bearer <your-translation-api-token>
```

### Option 2: X-API-Token Header
```
X-API-Token: <your-translation-api-token>
```

**Note**: The translation API token is different from your application's JWT tokens. It is configured via the `TRANSLATION_API_TOKEN` environment variable.

### Authentication Errors

If the token is missing or invalid, you will receive a `401 Unauthorized` response:

```json
{
  "statusCode": 401,
  "message": "Translation API token is required. Please provide token in Authorization header (Bearer <token>) or X-API-Token header"
}
```

or

```json
{
  "statusCode": 401,
  "message": "Invalid translation API token"
}
```

## Endpoints

### English to Hindi Transliteration

Transliterates English text (Roman script) to Hindi (Devanagari script), preserving pronunciation.

**Endpoint**: `POST /api/translation/en-to-hi`

**Headers**:
```
Authorization: Bearer <your-translation-api-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "text": "Hello, how are you today?"
}
```

**Request Parameters**:
| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `text` | string | Yes | The English text to transliterate | 1-5000 characters |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "originalText": "Hello, how are you today?",
    "translatedText": "हेलो, हाउ आर यू टुडे?",
    "sourceLanguage": "en",
    "targetLanguage": "hi"
  }
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `data.originalText` | string | The original input text |
| `data.translatedText` | string | The transliterated text (in Devanagari script) |
| `data.sourceLanguage` | string | Source language code (always "en" for this endpoint) |
| `data.targetLanguage` | string | Target language code (always "hi" for this endpoint) |

---

### Hindi to English Transliteration

Transliterates Hindi text (Devanagari script) to English (Roman script), preserving pronunciation.

**Endpoint**: `POST /api/translation/hi-to-en`

**Headers**:
```
Authorization: Bearer <your-translation-api-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "text": "नमस्ते, आज आप कैसे हैं?"
}
```

**Request Parameters**:
| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `text` | string | Yes | The Hindi text to transliterate | 1-5000 characters |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "originalText": "नमस्ते, आज आप कैसे हैं?",
    "translatedText": "Namaste, aaj aap kaise hain?",
    "sourceLanguage": "hi",
    "targetLanguage": "en"
  }
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `data.originalText` | string | The original input text |
| `data.translatedText` | string | The transliterated text (in Roman script) |
| `data.sourceLanguage` | string | Source language code (always "hi" for this endpoint) |
| `data.targetLanguage` | string | Target language code (always "en" for this endpoint) |

## Error Responses

### 400 Bad Request
Invalid request data (missing or invalid text field):

```json
{
  "success": false,
  "error": "Text field is required"
}
```

or

```json
{
  "errors": [
    {
      "msg": "Text is required and must be a non-empty string",
      "param": "text",
      "location": "body"
    }
  ]
}
```

### 401 Unauthorized
Missing or invalid API token (see [Authentication](#authentication) section).

### 429 Too Many Requests
OpenAI API rate limit exceeded:

```json
{
  "statusCode": 429,
  "message": "OpenAI API rate limit exceeded. Please try again later"
}
```

### 500 Internal Server Error
Server error or OpenAI API error:

```json
{
  "statusCode": 500,
  "message": "Transliteration failed: <error message>"
}
```

## Examples

### cURL Examples

#### English to Hindi Transliteration

```bash
curl -X POST http://localhost:5000/api/translation/en-to-hi \
  -H "Authorization: Bearer your-translation-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Welcome to our ecommerce platform. We offer a wide range of products."
  }'
```

#### Hindi to English Transliteration

```bash
curl -X POST http://localhost:5000/api/translation/hi-to-en \
  -H "Authorization: Bearer your-translation-api-token" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "नमस्ते, मैं एक डेवलपर हूँ।"
  }'
```

### JavaScript/TypeScript Example (Fetch API)

```javascript
// English to Hindi Transliteration
async function transliterateEnglishToHindi(text, apiToken) {
  const response = await fetch('http://localhost:5000/api/translation/en-to-hi', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Transliteration failed');
  }

  const result = await response.json();
  return result.data.translatedText;
}

// Usage
const transliteratedText = await transliterateEnglishToHindi(
  'Hello, how are you?',
  'your-translation-api-token'
);
console.log(transliteratedText); // "हेलो, हाउ आर यू?"
```

### Python Example

```python
import requests

def transliterate_english_to_hindi(text, api_token):
    url = 'http://localhost:5000/api/translation/en-to-hi'
    headers = {
        'Authorization': f'Bearer {api_token}',
        'Content-Type': 'application/json'
    }
    data = {'text': text}
    
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    
    result = response.json()
    return result['data']['translatedText']

# Usage
transliterated = transliterate_english_to_hindi(
    'Hello, how are you?',
    'your-translation-api-token'
)
print(transliterated)  # "हेलो, हाउ आर यू?"
```

### Node.js/Express Example

```javascript
const axios = require('axios');

async function transliterateEnglishToHindi(text, apiToken) {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/translation/en-to-hi',
      { text },
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data.data.translatedText;
  } catch (error) {
    console.error('Transliteration error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
transliterateEnglishToHindi('Hello, how are you?', 'your-translation-api-token')
  .then(transliterated => console.log(transliterated))
  .catch(error => console.error(error));
```

## Rate Limiting

The transliteration endpoints are subject to:
1. **Global API rate limiting**: 200 requests per 15 minutes per IP (production) or 500 requests per 15 minutes (development)
2. **OpenAI API rate limits**: Depends on your OpenAI API plan and usage

If you exceed rate limits, you will receive a `429 Too Many Requests` response.

## Best Practices

1. **Secure Token Storage**: Store your translation API token securely. Never commit it to version control or expose it in client-side code.

2. **Error Handling**: Always implement proper error handling for network errors, API errors, and rate limiting.

3. **Text Length**: Keep text chunks reasonable (under 1000 characters) for better transliteration quality and faster responses.

4. **Caching**: Consider caching transliterations for frequently used text to reduce API calls and costs.

5. **Batch Processing**: For multiple transliterations, make separate API calls rather than concatenating all text into a single request.

6. **Understanding Transliteration vs Translation**: Remember that transliteration preserves pronunciation, not meaning. "Hello" becomes "हेलो" (sounds similar), not "नमस्ते" (which is a translation).

## Setup Instructions

1. **Set Environment Variables**:
   - `OPENAI_API_KEY`: Your OpenAI API key (get from https://platform.openai.com/api-keys)
   - `TRANSLATION_API_TOKEN`: A secure random token for API authentication (generate using: `openssl rand -hex 32`)

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Server**:
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

4. **Test the Endpoints**:
   Use the examples above or tools like Postman to test the endpoints.

## Support

For issues or questions, please contact the development team or refer to the main project documentation.
