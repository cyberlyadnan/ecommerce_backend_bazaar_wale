"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUniqueIdentifiers = exports.serializeUser = exports.rejectVendor = exports.approveVendor = exports.changePassword = exports.resetPassword = exports.requestPasswordReset = exports.logout = exports.refreshAuthTokens = exports.resetPasswordWithFirebase = exports.registerWithFirebase = exports.loginWithFirebase = exports.loginWithPassword = exports.registerAdmin = exports.registerVendor = exports.registerCustomer = exports.getVendorApplicationStatus = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dayjs_1 = __importDefault(require("dayjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../config/logger"));
const Session_model_1 = __importDefault(require("../models/Session.model"));
const PasswordResetToken_model_1 = __importDefault(require("../models/PasswordResetToken.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const VendorVerification_model_1 = __importDefault(require("../models/VendorVerification.model"));
const getVendorApplicationStatus = async (userId) => {
    const verification = await VendorVerification_model_1.default.findOne({ userId })
        .select('status submittedAt reviewedAt adminNotes businessName gstNumber')
        .sort({ submittedAt: -1 })
        .lean();
    if (!verification) {
        return null;
    }
    return {
        status: verification.status,
        submittedAt: verification.submittedAt,
        reviewedAt: verification.reviewedAt,
        adminNotes: verification.adminNotes,
        businessName: verification.businessName,
        gstNumber: verification.gstNumber,
    };
};
exports.getVendorApplicationStatus = getVendorApplicationStatus;
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
const registerVendor = async (input, existingUserId) => {
    const { businessName, gstNumber, aadharNumber, panNumber, documents, password, ...rest } = input;
    const docList = Array.isArray(documents) ? documents : [];
    const aadhaarFront = docList.find((d) => d?.type === 'aadhaarFront' && d?.url);
    const aadhaarBack = docList.find((d) => d?.type === 'aadhaarBack' && d?.url);
    const gstCertDoc = docList.find((d) => d?.type === 'gstCertificate' && d?.url);
    const panCardDoc = docList.find((d) => d?.type === 'panCard' && d?.url);
    if (!gstNumber || !gstNumber.trim()) {
        throw new apiError_1.default(400, 'GST number is required for vendor registration');
    }
    if (!aadharNumber || !aadharNumber.trim()) {
        throw new apiError_1.default(400, 'Aadhaar number is required for vendor registration');
    }
    if (!panNumber || !panNumber.trim()) {
        throw new apiError_1.default(400, 'PAN number is required for vendor registration');
    }
    if (!aadhaarFront || !aadhaarBack || !gstCertDoc || !panCardDoc) {
        throw new apiError_1.default(400, 'Aadhaar front, Aadhaar back, GST certificate, and PAN card are required for vendor verification');
    }
    let user;
    // If existingUserId is provided, use existing user
    if (existingUserId) {
        const foundUser = await User_model_1.default.findById(existingUserId);
        if (!foundUser || foundUser.isDeleted) {
            throw new apiError_1.default(404, 'User not found');
        }
        user = foundUser;
        // Check if user is already a vendor or admin
        if (user.role === 'vendor' || user.role === 'admin') {
            throw new apiError_1.default(400, 'User is already a vendor or admin');
        }
        // Check if user already has a pending vendor request
        const existingRequest = await VendorVerification_model_1.default.findOne({
            userId: user._id,
            status: 'pending',
        });
        if (existingRequest) {
            throw new apiError_1.default(400, 'You already have a pending vendor application');
        }
        // Update user with vendor information (use existing user's name/email/phone if not provided)
        user.businessName = businessName;
        user.gstNumber = gstNumber;
        user.aadharNumber = aadharNumber;
        user.panNumber = panNumber;
        user.vendorStatus = 'pending';
        // Update name/email/phone only if provided in the request
        if (rest.name)
            user.name = rest.name;
        if (rest.email)
            user.email = rest.email;
        if (rest.phone)
            user.phone = rest.phone;
        // Don't change role yet - it will be changed when admin approves
        await user.save();
    }
    else {
        // Create new user - password is required when creating a new account
        // Only require password if we're actually creating a new user (not using existing account)
        if (!password || (typeof password === 'string' && password.trim().length < 6)) {
            throw new apiError_1.default(400, 'Password is required and must be at least 6 characters long when creating a new account');
        }
        const newUser = await (0, exports.registerCustomer)({
            ...rest,
        });
        newUser.role = 'vendor';
        newUser.businessName = businessName;
        newUser.gstNumber = gstNumber;
        newUser.aadharNumber = aadharNumber;
        newUser.panNumber = panNumber;
        newUser.vendorStatus = 'pending';
        newUser.passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
        await newUser.save();
        user = newUser;
    }
    // Create vendor verification request
    await VendorVerification_model_1.default.create({
        userId: user._id,
        businessName,
        gstNumber,
        aadharNumber,
        panNumber,
        documents: [
            { type: 'aadhaarFront', url: aadhaarFront.url, fileName: aadhaarFront.fileName },
            { type: 'aadhaarBack', url: aadhaarBack.url, fileName: aadhaarBack.fileName },
            { type: 'gstCertificate', url: gstCertDoc.url, fileName: gstCertDoc.fileName },
            { type: 'panCard', url: panCardDoc.url, fileName: panCardDoc.fileName },
        ],
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
    // Google OAuth provides email, name, and picture
    const tokenEmail = decoded.email;
    const tokenName = decoded.name;
    const tokenPicture = decoded.picture;
    const provider = decoded.firebase?.sign_in_provider || 'google.com';
    const firebaseUid = decoded.uid;
    // Require email for Google OAuth
    if (!tokenEmail && !email) {
        throw new apiError_1.default(400, 'Firebase token does not contain email. Google OAuth requires an email address.');
    }
    const finalEmail = email || tokenEmail;
    const finalName = name || tokenName || 'User';
    const isEmailVerified = Boolean(decoded.email_verified) || true; // Google emails are verified
    // Search for existing user by email OR Firebase UID (in case email changed)
    let user = await User_model_1.default.findOne({
        $or: [
            { email: finalEmail },
            { 'meta.firebaseUid': firebaseUid },
        ],
        isDeleted: false,
    });
    if (!user) {
        // Create new user with Google OAuth data - sync all data to MongoDB
        logger_1.default.info('Creating new user from Google OAuth', { email: finalEmail, name: finalName, firebaseUid });
        user = await User_model_1.default.create({
            role,
            name: finalName,
            email: finalEmail,
            isEmailVerified, // Google emails are verified
            meta: {
                firebaseUid,
                firebaseProvider: provider,
                picture: tokenPicture || null, // Store profile picture URL
                lastGoogleSync: new Date().toISOString(), // Track when we last synced from Google
                ...(decoded.email_verified !== undefined && { emailVerified: decoded.email_verified }),
            },
        });
        logger_1.default.info('User created successfully in MongoDB', { userId: user._id, email: finalEmail });
    }
    else {
        // Update existing user with latest Google OAuth data - sync to MongoDB
        const updateData = {};
        const metaUpdate = {
            ...(user.meta || {}),
            firebaseUid,
            firebaseProvider: provider,
            lastGoogleSync: new Date().toISOString(),
        };
        // Update email verification status
        if (!user.isEmailVerified && isEmailVerified) {
            updateData.isEmailVerified = true;
        }
        // Update name if provided and different (Google name takes precedence)
        if (finalName && user.name !== finalName) {
            updateData.name = finalName;
        }
        // Update email if different (shouldn't happen with Google, but handle it)
        if (email && user.email !== email) {
            await ensureIdentifiersAreFree(email, undefined, user.id);
            updateData.email = email;
        }
        else if (!user.email && finalEmail) {
            // If user doesn't have email, set it
            updateData.email = finalEmail;
        }
        // Update profile picture if available
        if (tokenPicture) {
            metaUpdate.picture = tokenPicture;
        }
        // Store email verification status in meta
        if (decoded.email_verified !== undefined) {
            metaUpdate.emailVerified = decoded.email_verified;
        }
        // Apply updates
        if (Object.keys(updateData).length > 0) {
            Object.assign(user, updateData);
        }
        user.meta = metaUpdate;
        await user.save();
        logger_1.default.info('User data synced from Google OAuth to MongoDB', {
            userId: user._id,
            email: finalEmail,
            updates: Object.keys(updateData),
            hasPicture: !!tokenPicture,
        });
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
    const email = decoded.email;
    if (!email) {
        throw new apiError_1.default(400, 'Firebase token does not contain email');
    }
    const user = await User_model_1.default.findOne({ email, isDeleted: false });
    if (!user) {
        throw new apiError_1.default(404, 'User not found');
    }
    user.passwordHash = await bcryptjs_1.default.hash(newPassword, SALT_ROUNDS);
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
    // Update user role to vendor and set status to active
    user.role = 'vendor';
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
