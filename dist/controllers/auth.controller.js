"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordWithFirebaseHandler = exports.registerWithFirebaseHandler = exports.profileHandler = exports.rejectVendorHandler = exports.approveVendorHandler = exports.changePasswordHandler = exports.resetPasswordHandler = exports.forgotPasswordHandler = exports.logoutHandler = exports.refreshHandler = exports.firebaseLoginHandler = exports.passwordLoginHandler = exports.registerAdminHandler = exports.registerVendorHandler = exports.registerCustomerHandler = void 0;
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
        const user = await (0, auth_service_1.registerVendor)(req.body);
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
            secure: req.secure,
            sameSite: 'strict',
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
            secure: req.secure,
            sameSite: 'strict',
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
            secure: req.secure,
            sameSite: 'strict',
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
            secure: req.secure,
            sameSite: 'strict',
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
};
