"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUploadRoot = exports.uploadMiddleware = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const UPLOAD_ROOT = path_1.default.resolve(process.cwd(), 'uploads');
const ensureDirectoryExists = (targetPath) => {
    if (!fs_1.default.existsSync(targetPath)) {
        fs_1.default.mkdirSync(targetPath, { recursive: true });
    }
};
const createSafeFolderName = (folder) => {
    if (!folder) {
        return null;
    }
    const safe = folder.trim();
    if (!safe) {
        return null;
    }
    return /^[a-zA-Z0-9-_]+$/.test(safe) ? safe : null;
};
const storage = multer_1.default.diskStorage({
    destination: (req, _file, cb) => {
        const folderParam = typeof req.query.folder === 'string' ? req.query.folder : undefined;
        const safeFolder = createSafeFolderName(folderParam);
        const destination = safeFolder ? path_1.default.join(UPLOAD_ROOT, safeFolder) : UPLOAD_ROOT;
        ensureDirectoryExists(destination);
        cb(null, destination);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname) || '';
        const baseName = path_1.default.basename(file.originalname, ext).replace(/\s+/g, '-');
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
const fileFilter = (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
        cb(null, true);
        return;
    }
    cb(new multer_1.default.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
};
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});
const getUploadRoot = () => UPLOAD_ROOT;
exports.getUploadRoot = getUploadRoot;
