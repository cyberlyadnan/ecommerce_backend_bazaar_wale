"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordWithFirebaseHandler = exports.registerWithFirebaseHandler = exports.profileHandler = exports.getVendorApplicationStatusHandler = exports.rejectVendorHandler = exports.approveVendorHandler = exports.changePasswordHandler = exports.resetPasswordHandler = exports.forgotPasswordHandler = exports.logoutHandler = exports.refreshHandler = exports.firebaseLoginHandler = exports.passwordLoginHandler = exports.registerAdminHandler = exports.registerVendorHandler = exports.registerCustomerHandler = void 0;
const auth_service_1 = require("../services/auth.service");
const registerCustomerHandler = async (req, res, next) => {
    try {
        const user = await (0, auth_service_1.registerCustomer)(req.body);
        res.status(201).json({ user: (0, auth_service_1.serializeUser)(user) });
    }
    catch (error) {
        next(error);
    }
};
exports.registerCustomerHandler = registerCustomerHandler;
const registerVendorHandler = async (req, res, next) => {
    try {
        // If user is authenticated, use their existing account
        const existingUserId = req.user?._id?.toString();
        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[registerVendorHandler]', {
                hasUser: !!req.user,
                existingUserId,
                userId: req.user?._id?.toString(),
                userEmail: req.user?.email,
                userRole: req.user?.role,
                hasAuthHeader: !!req.headers.authorization,
                authHeaderPreview: req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : null,
                bodyKeys: Object.keys(req.body),
                hasPassword: 'password' in req.body,
                passwordValue: 'password' in req.body ? (req.body.password ? '***' : 'empty/undefined') : 'not present',
            });
        }
        // If user is authenticated but existingUserId is somehow missing, log warning
        if (req.user && !existingUserId) {
            console.warn('[registerVendorHandler] User exists but _id is missing', {
                user: req.user,
            });
        }
        const user = await (0, auth_service_1.registerVendor)(req.body, existingUserId);
        res.status(201).json({ user: (0, auth_service_1.serializeUser)(user) });
    }
    catch (error) {
        next(error);
    }
};
exports.registerVendorHandler = registerVendorHandler;
const registerAdminHandler = async (req, res, next) => {
    try {
        const user = await (0, auth_service_1.registerAdmin)(req.body);
        res.status(201).json({ user: (0, auth_service_1.serializeUser)(user) });
    }
    catch (error) {
        next(error);
    }
};
exports.registerAdminHandler = registerAdminHandler;
const passwordLoginHandler = async (req, res, next) => {
    try {
        const { tokens, user } = await (0, auth_service_1.loginWithPassword)(req.body, {
            userAgent: req.get('user-agent') || undefined,
            ipAddress: req.ip,
        });
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        res.status(200).json({ accessToken: tokens.accessToken, user: (0, auth_service_1.serializeUser)(user) });
    }
    catch (error) {
        next(error);
    }
};
exports.passwordLoginHandler = passwordLoginHandler;
const firebaseLoginHandler = async (req, res, next) => {
    try {
        const { tokens, user } = await (0, auth_service_1.loginWithFirebase)(req.body, {
            userAgent: req.get('user-agent') || undefined,
            ipAddress: req.ip,
        });
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        res.status(200).json({ accessToken: tokens.accessToken, user: (0, auth_service_1.serializeUser)(user) });
    }
    catch (error) {
        next(error);
    }
};
exports.firebaseLoginHandler = firebaseLoginHandler;
const refreshHandler = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token missing' });
        }
        const { tokens, user } = await (0, auth_service_1.refreshAuthTokens)(refreshToken, {
            userAgent: req.get('user-agent') || undefined,
            ipAddress: req.ip,
        });
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        res.status(200).json({ accessToken: tokens.accessToken, user: (0, auth_service_1.serializeUser)(user) });
    }
    catch (error) {
        next(error);
    }
};
exports.refreshHandler = refreshHandler;
const logoutHandler = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (refreshToken) {
            await (0, auth_service_1.logout)(refreshToken);
        }
        res.clearCookie('refreshToken');
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.logoutHandler = logoutHandler;
const forgotPasswordHandler = async (req, res, next) => {
    try {
        await (0, auth_service_1.requestPasswordReset)(req.body.email);
        res.status(200).json({ message: 'If the email exists, password reset instructions have been sent.' });
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPasswordHandler = forgotPasswordHandler;
const resetPasswordHandler = async (req, res, next) => {
    try {
        const { email, token, password } = req.body;
        await (0, auth_service_1.resetPassword)(email, token, password);
        res.status(200).json({ message: 'Password reset successful' });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPasswordHandler = resetPasswordHandler;
const changePasswordHandler = async (req, res, next) => {
    try {
        await (0, auth_service_1.changePassword)(req.user.id, req.body.currentPassword, req.body.newPassword);
        res.status(200).json({ message: 'Password updated' });
    }
    catch (error) {
        next(error);
    }
};
exports.changePasswordHandler = changePasswordHandler;
const approveVendorHandler = async (req, res, next) => {
    try {
        await (0, auth_service_1.approveVendor)(req.params.vendorId, req.user.id);
        res.status(200).json({ message: 'Vendor approved' });
    }
    catch (error) {
        next(error);
    }
};
exports.approveVendorHandler = approveVendorHandler;
const rejectVendorHandler = async (req, res, next) => {
    try {
        await (0, auth_service_1.rejectVendor)(req.params.vendorId, req.user.id, req.body.reason);
        res.status(200).json({ message: 'Vendor rejected' });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectVendorHandler = rejectVendorHandler;
const getVendorApplicationStatusHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Authentication required');
        }
        const { getVendorApplicationStatus } = await Promise.resolve().then(() => __importStar(require('../services/auth.service')));
        const application = await getVendorApplicationStatus(req.user._id.toString());
        res.json({ application });
    }
    catch (error) {
        next(error);
    }
};
exports.getVendorApplicationStatusHandler = getVendorApplicationStatusHandler;
const profileHandler = async (req, res) => {
    res.status(200).json({ user: (0, auth_service_1.serializeUser)(req.user) });
};
exports.profileHandler = profileHandler;
const registerWithFirebaseHandler = async (req, res, next) => {
    try {
        const { tokens, user } = await (0, auth_service_1.registerWithFirebase)(req.body, {
            userAgent: req.get('user-agent') || undefined,
            ipAddress: req.ip,
        });
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        res.status(201).json({ accessToken: tokens.accessToken, user: (0, auth_service_1.serializeUser)(user) });
    }
    catch (error) {
        next(error);
    }
};
exports.registerWithFirebaseHandler = registerWithFirebaseHandler;
const resetPasswordWithFirebaseHandler = async (req, res, next) => {
    try {
        const { firebaseToken, password } = req.body;
        await (0, auth_service_1.resetPasswordWithFirebase)({ firebaseToken, newPassword: password });
        res.status(200).json({ message: 'Password reset successful' });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPasswordWithFirebaseHandler = resetPasswordWithFirebaseHandler;
exports.default = {
    registerCustomerHandler: exports.registerCustomerHandler,
    registerVendorHandler: exports.registerVendorHandler,
    registerAdminHandler: exports.registerAdminHandler,
    registerWithFirebaseHandler: exports.registerWithFirebaseHandler,
    passwordLoginHandler: exports.passwordLoginHandler,
    firebaseLoginHandler: exports.firebaseLoginHandler,
    refreshHandler: exports.refreshHandler,
    logoutHandler: exports.logoutHandler,
    forgotPasswordHandler: exports.forgotPasswordHandler,
    resetPasswordHandler: exports.resetPasswordHandler,
    resetPasswordWithFirebaseHandler: exports.resetPasswordWithFirebaseHandler,
    changePasswordHandler: exports.changePasswordHandler,
    approveVendorHandler: exports.approveVendorHandler,
    rejectVendorHandler: exports.rejectVendorHandler,
    profileHandler: exports.profileHandler,
    getVendorApplicationStatusHandler: exports.getVendorApplicationStatusHandler,
};
