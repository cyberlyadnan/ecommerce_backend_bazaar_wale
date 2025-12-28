import { Request, Response, NextFunction } from 'express';
import path from 'path';

import config from '../config';
import { getUploadRoot } from '../utils/upload';

export const uploadFileHandler = (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const relativePath = path.relative(getUploadRoot(), file.path).replace(/\\/g, '/');
    // Remove leading slash if present to avoid double slashes
    const cleanPath = relativePath ? relativePath.replace(/^\/+/, '') : '';
    const baseUrl = config.app.baseUrl.replace(/\/$/, '');
    // Construct URL ensuring no double slashes
    const url = cleanPath ? `${baseUrl}/uploads/${cleanPath}` : `${baseUrl}/uploads`;

    res.status(201).json({
      file: {
        id: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
      },
    });
  } catch (error) {
    next(error);
  }
};


