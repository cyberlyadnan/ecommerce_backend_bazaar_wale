"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUniqueIdentifiers = exports.serializeUser = exports.rejectVendor = exports.approveVendor = exports.changePassword = exports.resetPassword = exports.requestPasswordReset = exports.logout = exports.refreshAuthTokens = exports.resetPasswordWithFirebase = exports.registerWithFirebase = exports.loginWithFirebase = exports.loginWithPassword = exports.registerAdmin = exports.registerVendor = exports.registerCustomer = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dayjs_1 = __importDefault(require("dayjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const Session_model_1 = __importDefault(require("../models/Session.model"));
const PasswordResetToken_model_1 = __importDefault(require("../models/PasswordResetToken.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const VendorVerification_model_1 = __importDefault(require("../models/VendorVerification.model"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const email_1 = require("../utils/email");
const firebase_service_1 = require("./firebase.service");
const SALT_ROUNDS = 12;
const hashValue = (value) => crypto_1.default.createHash('sha256').update(value).digest('hex');
const ensureIdentifiersAreFree = async (email, phone, excludeUserId) => {
    const query = { isDeleted: false };
    const or = [];
    if (email) {
        or.push({ email });
    }
    if (phone) {
        or.push({ phone });
    }
    if (or.length === 0) {
        return;
    }
    if (excludeUserId) {
        query._id = { $ne: excludeUserId };
    }
    query.$or = or;
    const existing = await User_model_1.default.findOne(query);
    if (existing) {
        throw new apiError_1.default(409, 'Email or phone already in use');
    }
};
const DEFAULT_ACCESS_EXPIRY_MS = 15 * 60 * 1000;
const DEFAULT_REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const parseExpiryStringToMs = (value, fallbackMs = DEFAULT_REFRESH_EXPIRY_MS) => {
    const match = value.trim().match(/^(\d+)([smhd])$/i);
    if (!match) {
        return fallbackMs;
    }
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
        case 's':
            return amount * 1000;
        case 'm':
            return amount * 60 * 1000;
        case 'h':
            return amount * 60 * 60 * 1000;
        case 'd':
            return amount * 24 * 60 * 60 * 1000;
        default:
            return fallbackMs;
    }
};
const getRefreshExpiryDate = () => new Date(Date.now() + parseExpiryStringToMs(config_1.default.jwt.refreshExpiresIn));
const getAccessExpirySeconds = () => Math.max(1, Math.round(parseExpiryStringToMs(config_1.default.jwt.accessExpiresIn, DEFAULT_ACCESS_EXPIRY_MS) / 1000));
const signTokens = (user, sessionId) => {
    const payload = {
        sub: user.id,
        role: user.role,
        sessionId,
    };
    const accessOptions = { expiresIn: getAccessExpirySeconds() };
    const refreshOptions = {
        expiresIn: Math.max(60, Math.round(parseExpiryStringToMs(config_1.default.jwt.refreshExpiresIn) / 1000)),
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, config_1.default.jwt.accessSecret, accessOptions);
    const refreshToken = jsonwebtoken_1.default.sign(payload, config_1.default.jwt.refreshSecret, refreshOptions);
    return { accessToken, refreshToken };
};
const registerCustomer = async (input) => {
    const { name, email, phone, password } = input;
    if (!email && !phone) {
        throw new apiError_1.default(400, 'Either email or phone must be provided');
    }
    await ensureIdentifiersAreFree(email, phone);
    const doc = {
        role: 'customer',
        name,
        email,
        phone,
        isPhoneVerified: false,
        isEmailVerified: false,
    };
    if (password) {
        doc.passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
    }
    const user = await User_model_1.default.create(doc);
    return user;
};
exports.registerCustomer = registerCustomer;
const registerVendor = async (input) => {
    const { businessName, gstNumber, aadharNumber, documents, password, ...rest } = input;
    const user = await (0, exports.registerCustomer)({
        ...rest,
    });
    user.role = 'vendor';
    user.businessName = businessName;
    if (gstNumber)
        user.gstNumber = gstNumber;
    if (aadharNumber)
        user.aadharNumber = aadharNumber;
    user.vendorStatus = 'pending';
    if (password) {
        user.passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
    }
    await user.save();
    await VendorVerification_model_1.default.create({
        userId: user._id,
        businessName,
        gstNumber,
        aadharNumber,
        documents,
    });
    if (user.email) {
        await (0, email_1.sendMail)({
            to: user.email,
            subject: 'Vendor application received',
            html: `<p>Hi ${user.name},</p><p>We have received your vendor application. Our team will review it and notify you once it is approved.</p>`,
        });
    }
    return user;
};
exports.registerVendor = registerVendor;
const registerAdmin = async (input) => {
    const { name, email, password } = input;
    if (!email) {
        throw new apiError_1.default(400, 'Admin registration requires an email address');
    }
    if (!password) {
        throw new apiError_1.default(400, 'Admin registration requires a password');
    }
    await ensureIdentifiersAreFree(email);
    const user = await User_model_1.default.create({
        role: 'admin',
        name,
        email,
        passwordHash: await bcryptjs_1.default.hash(password, SALT_ROUNDS),
        isEmailVerified: true,
        isPhoneVerified: true,
    });
    return user;
};
exports.registerAdmin = registerAdmin;
const loginWithPassword = async ({ identifier, role, password, }, context) => {
    const query = {
        isDeleted: false,
    };
    if (identifier.includes('@')) {
        query.email = identifier;
    }
    else {
        query.phone = identifier;
    }
    if (role) {
        query.role = role;
    }
    const user = await User_model_1.default.findOne(query);
    if (!user || !user.passwordHash) {
        throw new apiError_1.default(401, 'Invalid credentials');
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isMatch) {
        throw new apiError_1.default(401, 'Invalid credentials');
    }
    if (user.role === 'vendor' && user.vendorStatus !== 'active') {
        throw new apiError_1.default(403, `Vendor account is ${user.vendorStatus}. Please contact support.`);
    }
    const sessionExpiry = getRefreshExpiryDate();
    const session = new Session_model_1.default({
        user: user._id,
        role: user.role,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        expiresAt: sessionExpiry,
    });
    const pair = signTokens(user, session.id);
    session.refreshTokenHash = hashValue(pair.refreshToken);
    session.expiresAt = sessionExpiry;
    await session.save();
    await User_model_1.default.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    return {
        user,
        tokens: pair,
    };
};
exports.loginWithPassword = loginWithPassword;
const loginWithFirebase = async ({ firebaseToken, role = 'customer', name, email }, context) => {
    const decoded = await (0, firebase_service_1.verifyFirebaseIdToken)(firebaseToken);
    const phoneNumber = decoded.phone_number;
    const tokenEmail = decoded.email;
    if (!phoneNumber && !tokenEmail && !email) {
        throw new apiError_1.default(400, 'Firebase token does not contain phone number or email');
    }
    const search = [];
    if (phoneNumber)
        search.push({ phone: phoneNumber });
    if (tokenEmail)
        search.push({ email: tokenEmail });
    if (email)
        search.push({ email });
    let user = await User_model_1.default.findOne({ $or: search });
    if (!user) {
        user = await User_model_1.default.create({
            role,
            name: name || decoded.name || 'User',
            email: email || tokenEmail,
            phone: phoneNumber,
            isPhoneVerified: Boolean(phoneNumber),
            isEmailVerified: Boolean(decoded.email_verified) || Boolean(email),
            meta: {
                firebaseUid: decoded.uid,
                firebaseProvider: decoded.firebase?.sign_in_provider,
            },
        });
    }
    else {
        user.isPhoneVerified = user.isPhoneVerified || Boolean(phoneNumber);
        user.isEmailVerified = user.isEmailVerified || Boolean(decoded.email_verified);
        user.meta = {
            ...user.meta,
            firebaseUid: decoded.uid,
            firebaseProvider: decoded.firebase?.sign_in_provider,
        };
        if (name && user.name !== name) {
            user.name = name;
        }
        if (email && user.email !== email) {
            await ensureIdentifiersAreFree(email, undefined, user.id);
            user.email = email;
        }
        else if (!user.email && tokenEmail) {
            user.email = tokenEmail;
        }
        await user.save();
    }
    if (user.role === 'vendor' && user.vendorStatus !== 'active') {
        throw new apiError_1.default(403, `Vendor account is ${user.vendorStatus}. Please contact support.`);
    }
    const sessionExpiry = getRefreshExpiryDate();
    const session = new Session_model_1.default({
        user: user._id,
        role: user.role,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        expiresAt: sessionExpiry,
    });
    const pair = signTokens(user, session.id);
    session.refreshTokenHash = hashValue(pair.refreshToken);
    session.expiresAt = sessionExpiry;
    await session.save();
    await User_model_1.default.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    return {
        user,
        tokens: pair,
    };
};
exports.loginWithFirebase = loginWithFirebase;
const registerWithFirebase = async (input, context) => {
    const result = await (0, exports.loginWithFirebase)(input, context);
    const { profile } = input;
    if (profile?.email && result.user.email !== profile.email) {
        await ensureIdentifiersAreFree(profile.email, undefined, result.user.id);
        result.user.email = profile.email;
        result.user.isEmailVerified = false;
        await result.user.save();
    }
    return result;
};
exports.registerWithFirebase = registerWithFirebase;
const resetPasswordWithFirebase = async ({ firebaseToken, newPassword, }) => {
    const decoded = await (0, firebase_service_1.verifyFirebaseIdToken)(firebaseToken);
    const phoneNumber = decoded.phone_number;
    const email = decoded.email;
    const search = [];
    if (phoneNumber)
        search.push({ phone: phoneNumber });
    if (email)
        search.push({ email });
    if (search.length === 0) {
        throw new apiError_1.default(400, 'Firebase token does not contain phone number or email');
    }
    const user = await User_model_1.default.findOne({ $or: search, isDeleted: false });
    if (!user) {
        throw new apiError_1.default(404, 'User not found');
    }
    user.passwordHash = await bcryptjs_1.default.hash(newPassword, SALT_ROUNDS);
    user.isPhoneVerified = user.isPhoneVerified || Boolean(phoneNumber);
    user.isEmailVerified = user.isEmailVerified || Boolean(decoded.email_verified);
    await user.save();
    await Session_model_1.default.deleteMany({ user: user._id });
    return user;
};
exports.resetPasswordWithFirebase = resetPasswordWithFirebase;
const refreshAuthTokens = async (refreshToken, context) => {
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(refreshToken, config_1.default.jwt.refreshSecret);
    }
    catch (error) {
        throw new apiError_1.default(401, 'Invalid refresh token');
    }
    const sessionId = payload.sessionId;
    if (!sessionId) {
        throw new apiError_1.default(401, 'Invalid session');
    }
    const session = await Session_model_1.default.findById(sessionId);
    if (!session) {
        throw new apiError_1.default(401, 'Session not found');
    }
    const hashed = hashValue(refreshToken);
    if (hashed !== session.refreshTokenHash) {
        throw new apiError_1.default(401, 'Refresh token mismatch');
    }
    if ((0, dayjs_1.default)().isAfter((0, dayjs_1.default)(session.expiresAt))) {
        await session.deleteOne();
        throw new apiError_1.default(401, 'Session expired');
    }
    const user = await User_model_1.default.findById(session.user);
    if (!user || user.isDeleted) {
        throw new apiError_1.default(401, 'User not found');
    }
    const tokens = signTokens(user, session.id);
    session.refreshTokenHash = hashValue(tokens.refreshToken);
    session.expiresAt = getRefreshExpiryDate();
    if (context) {
        session.userAgent = context.userAgent ?? session.userAgent;
        session.ipAddress = context.ipAddress ?? session.ipAddress;
    }
    await session.save();
    return { user, tokens };
};
exports.refreshAuthTokens = refreshAuthTokens;
const logout = async (refreshToken) => {
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(refreshToken, config_1.default.jwt.refreshSecret);
    }
    catch {
        return;
    }
    if (!payload.sessionId) {
        return;
    }
    await Session_model_1.default.deleteOne({ _id: payload.sessionId });
};
exports.logout = logout;
const requestPasswordReset = async (email) => {
    const user = await User_model_1.default.findOne({ email, isDeleted: false });
    if (!user) {
        return;
    }
    const rawToken = crypto_1.default.randomBytes(32).toString('hex');
    const tokenHash = hashValue(rawToken);
    const expiresAt = (0, dayjs_1.default)().add(1, 'hour').toDate();
    await PasswordResetToken_model_1.default.create({
        user: user._id,
        tokenHash,
        expiresAt,
    });
    const resetUrl = `${config_1.default.app.baseUrl}/auth/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
    await (0, email_1.sendMail)({
        to: email,
        subject: 'Reset your password',
        html: `<p>Hi ${user.name},</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (email, token, newPassword) => {
    const user = await User_model_1.default.findOne({ email, isDeleted: false });
    if (!user) {
        throw new apiError_1.default(400, 'Invalid password reset request');
    }
    const tokenHash = hashValue(token);
    const record = await PasswordResetToken_model_1.default.findOne({
        user: user._id,
        tokenHash,
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
    });
    if (!record) {
        throw new apiError_1.default(400, 'Invalid or expired password reset token');
    }
    user.passwordHash = await bcryptjs_1.default.hash(newPassword, SALT_ROUNDS);
    await user.save();
    record.usedAt = new Date();
    await record.save();
    await Session_model_1.default.deleteMany({ user: user._id });
};
exports.resetPassword = resetPassword;
const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await User_model_1.default.findById(userId);
    if (!user || !user.passwordHash) {
        throw new apiError_1.default(404, 'User not found');
    }
    const isMatch = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
        throw new apiError_1.default(400, 'Current password is incorrect');
    }
    user.passwordHash = await bcryptjs_1.default.hash(newPassword, SALT_ROUNDS);
    await user.save();
    await Session_model_1.default.deleteMany({ user: user._id });
};
exports.changePassword = changePassword;
const approveVendor = async (vendorId, adminId) => {
    const user = await User_model_1.default.findById(vendorId);
    if (!user) {
        throw new apiError_1.default(404, 'Vendor not found');
    }
    user.vendorStatus = 'active';
    await user.save();
    await VendorVerification_model_1.default.findOneAndUpdate({ userId: user._id }, { status: 'approved', reviewedBy: adminId, reviewedAt: new Date() });
    if (user.email) {
        await (0, email_1.sendMail)({
            to: user.email,
            subject: 'Vendor application approved',
            html: `<p>Hi ${user.name},</p><p>Your vendor account has been approved. You can now log in and start managing your products.</p>`,
        });
    }
};
exports.approveVendor = approveVendor;
const rejectVendor = async (vendorId, adminId, reason) => {
    const user = await User_model_1.default.findById(vendorId);
    if (!user) {
        throw new apiError_1.default(404, 'Vendor not found');
    }
    user.vendorStatus = 'rejected';
    await user.save();
    await VendorVerification_model_1.default.findOneAndUpdate({ userId: user._id }, {
        status: 'rejected',
        adminNotes: reason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
    });
    if (user.email) {
        await (0, email_1.sendMail)({
            to: user.email,
            subject: 'Vendor application rejected',
            html: `<p>Hi ${user.name},</p><p>We are unable to approve your vendor application at this time.${reason ? ` Reason: ${reason}` : ''}</p>`,
        });
    }
};
exports.rejectVendor = rejectVendor;
const serializeUser = (user) => ({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    businessName: user.businessName,
    gstNumber: user.gstNumber,
    vendorStatus: user.vendorStatus,
    isPhoneVerified: user.isPhoneVerified,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});
exports.serializeUser = serializeUser;
exports.verifyUniqueIdentifiers = ensureIdentifiersAreFree;
exports.default = {
    registerCustomer: exports.registerCustomer,
    registerVendor: exports.registerVendor,
    registerAdmin: exports.registerAdmin,
    registerWithFirebase: exports.registerWithFirebase,
    loginWithPassword: exports.loginWithPassword,
    loginWithFirebase: exports.loginWithFirebase,
    refreshAuthTokens: exports.refreshAuthTokens,
    logout: exports.logout,
    requestPasswordReset: exports.requestPasswordReset,
    resetPassword: exports.resetPassword,
    resetPasswordWithFirebase: exports.resetPasswordWithFirebase,
    changePassword: exports.changePassword,
    approveVendor: exports.approveVendor,
    rejectVendor: exports.rejectVendor,
    serializeUser: exports.serializeUser,
    verifyUniqueIdentifiers: exports.verifyUniqueIdentifiers,
};
