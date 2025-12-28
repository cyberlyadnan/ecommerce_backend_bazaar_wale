import fs from 'fs';
import path from 'path';
import multer from 'multer';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

const ensureDirectoryExists = (targetPath: string) => {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
};

const createSafeFolderName = (folder?: string) => {
  if (!folder) {
    return null;
  }
  const safe = folder.trim();
  if (!safe) {
    return null;
  }
  return /^[a-zA-Z0-9-_]+$/.test(safe) ? safe : null;
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folderParam = typeof req.query.folder === 'string' ? req.query.folder : undefined;
    const safeFolder = createSafeFolderName(folderParam);
    const destination = safeFolder ? path.join(UPLOAD_ROOT, safeFolder) : UPLOAD_ROOT;
    ensureDirectoryExists(destination);
    cb(null, destination);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '';
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${baseName}-${timestamp}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
  'application/pdf',
]);

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const getUploadRoot = () => UPLOAD_ROOT;


