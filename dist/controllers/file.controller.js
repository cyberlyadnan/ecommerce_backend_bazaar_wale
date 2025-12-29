"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileHandler = void 0;
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const upload_1 = require("../utils/upload");
/**
 * Get the base URL for image URLs
 * Always uses APP_BASE_URL from environment variables to ensure consistency
 * This ensures image URLs match the API base URL used by the frontend
 */
function getBaseUrlFromRequest(req) {
    // Get protocol and host from request (respects proxy headers)
    const protocol = req.protocol || (req.secure ? 'https' : 'http');
    const forwardedHost = req.get('x-forwarded-host');
    const host = forwardedHost || req.get('host') || req.hostname;
    // Check if request is from production (not localhost)
    const isProductionRequest = host && !host.includes('localhost') && !host.includes('127.0.0.1');
    const requestUrl = isProductionRequest ? `${protocol}://${host}` : null;
    console.log('[File Upload] Request URL:', requestUrl);
    // Get APP_BASE_URL from config
    const configUrl = config_1.default.app.baseUrl?.trim();
    const isConfigLocalhost = configUrl?.includes('localhost') || configUrl?.includes('127.0.0.1');
    // Priority 1: Use APP_BASE_URL if it's set and not localhost
    if (configUrl && !isConfigLocalhost) {
        const baseUrl = configUrl.replace(/\/+$/, '');
        if (config_1.default.app.env === 'development') {
            console.log('[File Upload] Using APP_BASE_URL:', baseUrl);
        }
        return baseUrl;
    }
    // Priority 2: If we're in production and request is from production, use request URL
    // This handles the case where APP_BASE_URL is not set or is localhost
    if (isProductionRequest && requestUrl) {
        if (isConfigLocalhost || !configUrl) {
            console.warn('⚠️  APP_BASE_URL is not set or is localhost!', 'Using detected production URL from request:', requestUrl, '\n⚠️  Please set APP_BASE_URL=https://api.bazaarwale.in in your .env file for consistency.');
        }
        return requestUrl;
    }
    // Priority 3: Use APP_BASE_URL even if localhost (development)
    if (configUrl) {
        const baseUrl = configUrl.replace(/\/+$/, '');
        console.log('[File Upload] Using APP_BASE_URL (development):', baseUrl);
        return baseUrl;
    }
    // Priority 4: Fallback to request URL (development)
    const fallbackHost = host || 'localhost';
    const port = req.app.get('port') || config_1.default.app.port;
    const fallbackUrl = `${protocol}://${fallbackHost}${fallbackHost.includes(':') ? '' : `:${port}`}`;
    console.log('[File Upload] Using fallback URL:', fallbackUrl);
    return fallbackUrl;
}
const uploadFileHandler = (req, res, next) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'File is required' });
        }
        const relativePath = path_1.default.relative((0, upload_1.getUploadRoot)(), file.path).replace(/\\/g, '/');
        // Remove leading slash if present to avoid double slashes
        const cleanPath = relativePath ? relativePath.replace(/^\/+/, '') : '';
        // Get base URL from request (works in both dev and production)
        const baseUrl = getBaseUrlFromRequest(req).replace(/\/$/, '');
        // Construct URL ensuring no double slashes
        const url = cleanPath ? `${baseUrl}/uploads/${cleanPath}` : `${baseUrl}/uploads`;
        // Log the generated URL (especially important in production to debug)
        console.log('[File Upload] Generated URL:', url);
        console.log('[File Upload] Environment:', config_1.default.app.env);
        console.log('[File Upload] APP_BASE_URL from config:', config_1.default.app.baseUrl);
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
