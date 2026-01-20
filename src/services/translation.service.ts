import OpenAI from 'openai';
import config from '../config';
import ApiError from '../utils/apiError';

const openai = new OpenAI({
  apiKey: config.translation.openaiApiKey,
});

export interface TranslationRequest {
  text: string;
}

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Transliterate text from English (Roman script) to Hindi (Devanagari script) using OpenAI GPT-4o-mini
 * Transliteration converts the script while preserving pronunciation
 */
export const translateEnglishToHindi = async (
  request: TranslationRequest,
): Promise<TranslationResponse> => {
  try {
    if (!request.text || typeof request.text !== 'string' || request.text.trim().length === 0) {
      throw new ApiError(400, 'Text is required and must be a non-empty string');
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional transliterator. Your task is to transliterate (convert script) English text written in Roman script to Hindi text written in Devanagari script. Transliteration means converting the script while preserving the pronunciation and sound of the words, NOT translating the meaning. For example: "Hello" should become "हेलो" (pronounced similarly), not "नमस्ते" (which is a translation). Return only the transliterated text in Devanagari script without any explanations, notes, or additional text. Preserve the original formatting, punctuation, spaces, and structure. Convert each word phonetically to match how it sounds in English.',
        },
        {
          role: 'user',
          content: request.text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const translatedText = response.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new ApiError(500, 'Transliteration failed: No response from OpenAI');
    }

    return {
      originalText: request.text,
      translatedText,
      sourceLanguage: 'en',
      targetLanguage: 'hi',
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      // Handle OpenAI API errors
      if (error.message.includes('API key')) {
        throw new ApiError(500, 'OpenAI API key is invalid or missing');
      }
      if (error.message.includes('rate limit')) {
        throw new ApiError(429, 'OpenAI API rate limit exceeded. Please try again later');
      }
      throw new ApiError(500, `Transliteration failed: ${error.message}`);
    }

    throw new ApiError(500, 'Transliteration failed: Unknown error occurred');
  }
};

/**
 * Transliterate text from Hindi (Devanagari script) to English (Roman script) using OpenAI GPT-4o-mini
 * Transliteration converts the script while preserving pronunciation
 */
export const translateHindiToEnglish = async (
  request: TranslationRequest,
): Promise<TranslationResponse> => {
  try {
    if (!request.text || typeof request.text !== 'string' || request.text.trim().length === 0) {
      throw new ApiError(400, 'Text is required and must be a non-empty string');
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional transliterator. Your task is to transliterate (convert script) Hindi text written in Devanagari script to English text written in Roman script. Transliteration means converting the script while preserving the pronunciation and sound of the words, NOT translating the meaning. For example: "नमस्ते" should become "Namaste" (pronounced similarly), not "Hello" (which is a translation). Return only the transliterated text in Roman script without any explanations, notes, or additional text. Preserve the original formatting, punctuation, spaces, and structure. Use standard Roman transliteration (like IAST or simplified) that matches the pronunciation of the Hindi text.',
        },
        {
          role: 'user',
          content: request.text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const translatedText = response.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new ApiError(500, 'Transliteration failed: No response from OpenAI');
    }

    return {
      originalText: request.text,
      translatedText,
      sourceLanguage: 'hi',
      targetLanguage: 'en',
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      // Handle OpenAI API errors
      if (error.message.includes('API key')) {
        throw new ApiError(500, 'OpenAI API key is invalid or missing');
      }
      if (error.message.includes('rate limit')) {
        throw new ApiError(429, 'OpenAI API rate limit exceeded. Please try again later');
      }
      throw new ApiError(500, `Transliteration failed: ${error.message}`);
    }

    throw new ApiError(500, 'Transliteration failed: Unknown error occurred');
  }
};
