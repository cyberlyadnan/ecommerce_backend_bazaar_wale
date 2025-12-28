"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.requireCustomer = exports.requireVendor = exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const User_model_1 = __importDefault(require("../models/User.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const authenticate = (allowedRoles) => async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7)) ||
            req.cookies.accessToken;
        if (!token) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, config_1.default.jwt.accessSecret);
        }
        catch {
            throw new apiError_1.default(401, 'Invalid or expired token');
        }
        const user = await User_model_1.default.findById(payload.sub);
        if (!user || user.isDeleted) {
            throw new apiError_1.default(401, 'User not found');
        }
        if (allowedRoles && !allowedRoles.includes(user.role)) {
            throw new apiError_1.default(403, 'You do not have permission to perform this action');
        }
        req.user = user;
        req.tokenPayload = payload;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
exports.requireAdmin = (0, exports.authenticate)(['admin']);
exports.requireVendor = (0, exports.authenticate)(['vendor']);
exports.requireCustomer = (0, exports.authenticate)(['customer']);
/**
 * Optional authentication middleware - doesn't throw if no token is provided
 * Sets req.user if token is valid, otherwise continues without setting it
 */
const optionalAuthenticate = () => async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7)) ||
            req.cookies.accessToken;
        if (!token) {
            if (process.env.NODE_ENV === 'development') {
                console.log('[optionalAuthenticate] No token found', {
                    hasAuthHeader: !!authHeader,
                    authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : null,
                    hasCookie: !!req.cookies.accessToken,
                });
            }
            return next();
        }
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, config_1.default.jwt.accessSecret);
        }
        catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.log('[optionalAuthenticate] Token verification failed', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
            return next();
        }
        const user = await User_model_1.default.findById(payload.sub);
        if (user && !user.isDeleted) {
            req.user = user;
            req.tokenPayload = payload;
            if (process.env.NODE_ENV === 'development') {
                console.log('[optionalAuthenticate] User authenticated', {
                    userId: user._id.toString(),
                    email: user.email,
                    role: user.role,
                });
            }
        }
        else {
            if (process.env.NODE_ENV === 'development') {
                console.log('[optionalAuthenticate] User not found or deleted', {
                    userId: payload.sub,
                    userFound: !!user,
                    isDeleted: user?.isDeleted,
                });
            }
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
exports.default = {
    authenticate: exports.authenticate,
    optionalAuthenticate: exports.optionalAuthenticate,
    requireAdmin: exports.requireAdmin,
    requireVendor: exports.requireVendor,
    requireCustomer: exports.requireCustomer,
};
