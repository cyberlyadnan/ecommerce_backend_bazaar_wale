"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileHandler = void 0;
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const upload_1 = require("../utils/upload");
const uploadFileHandler = (req, res, next) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'File is required' });
        }
        const relativePath = path_1.default.relative((0, upload_1.getUploadRoot)(), file.path).replace(/\\/g, '/');
        // Remove leading slash if present to avoid double slashes
        const cleanPath = relativePath ? relativePath.replace(/^\/+/, '') : '';
        const baseUrl = config_1.default.app.baseUrl.replace(/\/$/, '');
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
    }
    catch (error) {
        next(error);
    }
};
exports.uploadFileHandler = uploadFileHandler;
