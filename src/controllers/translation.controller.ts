import { NextFunction, Request, Response } from 'express';
import * as translationService from '../services/translation.service';

/**
 * Transliterate text from English (Roman script) to Hindi (Devanagari script)
 * POST /api/translation/en-to-hi
 */
export const translateEnglishToHindiHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text field is required',
      });
    }

    const result = await translationService.translateEnglishToHindi({ text });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transliterate text from Hindi (Devanagari script) to English (Roman script)
 * POST /api/translation/hi-to-en
 */
export const translateHindiToEnglishHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text field is required',
      });
    }

    const result = await translationService.translateHindiToEnglish({ text });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
