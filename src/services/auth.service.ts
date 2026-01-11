import crypto from 'crypto';

import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import jwt, { SignOptions } from 'jsonwebtoken';

import config from '../config';
import logger from '../config/logger';
import Session from '../models/Session.model';
import PasswordResetToken from '../models/PasswordResetToken.model';
import User, { IUser, UserDocument, UserRole } from '../models/User.model';
import VendorVerification from '../models/VendorVerification.model';

export const getVendorApplicationStatus = async (userId: string) => {
  const verification = await VendorVerification.findOne({ userId })
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
import ApiError from '../utils/apiError';
import { sendMail } from '../utils/email';
import { verifyFirebaseIdToken } from './firebase.service';

const SALT_ROUNDS = 12;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RegisterCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  password?: string;
}

interface RegisterVendorInput extends RegisterCustomerInput {
  businessName: string;
  gstNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  documents?: {
    type?: string;
    url?: string;
    fileName?: string;
  }[];
}

interface PasswordLoginInput {
  identifier: string; // email or phone
  role?: UserRole;
  password: string;
}

interface FirebaseLoginInput {
  firebaseToken: string;
  role?: UserRole;
  name?: string;
  email?: string;
}

interface FirebaseRegisterInput extends FirebaseLoginInput {
  profile?: {
    email?: string;
  };
}

interface FirebasePasswordResetInput {
  firebaseToken: string;
  newPassword: string;
}

const hashValue = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const ensureIdentifiersAreFree = async (email?: string, phone?: string, excludeUserId?: string) => {
  const query: Record<string, unknown> = { isDeleted: false };
  const or: Record<string, unknown>[] = [];

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

  const existing = await User.findOne(query);
  if (existing) {
    throw new ApiError(409, 'Email or phone already in use');
  }
};

const DEFAULT_ACCESS_EXPIRY_MS = 15 * 60 * 1000;
const DEFAULT_REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

const parseExpiryStringToMs = (value: string, fallbackMs = DEFAULT_REFRESH_EXPIRY_MS): number => {
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

const getRefreshExpiryDate = () =>
  new Date(Date.now() + parseExpiryStringToMs(config.jwt.refreshExpiresIn));

const getAccessExpirySeconds = () =>
  Math.max(1, Math.round(parseExpiryStringToMs(config.jwt.accessExpiresIn, DEFAULT_ACCESS_EXPIRY_MS) / 1000));

const signTokens = (user: UserDocument, sessionId: string): TokenPair => {
  const payload = {
    sub: user.id,
    role: user.role,
    sessionId,
  };

  const accessOptions: SignOptions = { expiresIn: getAccessExpirySeconds() };
  const refreshOptions: SignOptions = {
    expiresIn: Math.max(
      60,
      Math.round(parseExpiryStringToMs(config.jwt.refreshExpiresIn) / 1000),
    ),
  };

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, accessOptions);
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, refreshOptions);

  return { accessToken, refreshToken };
};

export const registerCustomer = async (input: RegisterCustomerInput): Promise<UserDocument> => {
  const { name, email, phone, password } = input;

  if (!email && !phone) {
    throw new ApiError(400, 'Either email or phone must be provided');
  }

  await ensureIdentifiersAreFree(email, phone);

  const doc: Partial<IUser> = {
    role: 'customer',
    name,
    email,
    phone,
    isPhoneVerified: false,
    isEmailVerified: false,
  };

  if (password) {
    doc.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const user = await User.create(doc);
  return user;
};

export const registerVendor = async (
  input: RegisterVendorInput,
  existingUserId?: string,
): Promise<UserDocument> => {
  const { businessName, gstNumber, aadharNumber, panNumber, documents, password, ...rest } = input;

  const docList = Array.isArray(documents) ? documents : [];
  const aadhaarFront = docList.find((d) => d?.type === 'aadhaarFront' && d?.url);
  const aadhaarBack = docList.find((d) => d?.type === 'aadhaarBack' && d?.url);
  const gstCertDoc = docList.find((d) => d?.type === 'gstCertificate' && d?.url);
  const panCardDoc = docList.find((d) => d?.type === 'panCard' && d?.url);

  if (!gstNumber || !gstNumber.trim()) {
    throw new ApiError(400, 'GST number is required for vendor registration');
  }

  if (!aadharNumber || !aadharNumber.trim()) {
    throw new ApiError(400, 'Aadhaar number is required for vendor registration');
  }

  if (!panNumber || !panNumber.trim()) {
    throw new ApiError(400, 'PAN number is required for vendor registration');
  }

  if (!aadhaarFront || !aadhaarBack || !gstCertDoc || !panCardDoc) {
    throw new ApiError(
      400,
      'Aadhaar front, Aadhaar back, GST certificate, and PAN card are required for vendor verification',
    );
  }

  let user: UserDocument;

  // If existingUserId is provided, use existing user
  if (existingUserId) {
    const foundUser = await User.findById(existingUserId);
    if (!foundUser || foundUser.isDeleted) {
      throw new ApiError(404, 'User not found');
    }
    user = foundUser;

    // Check if user is already a vendor or admin
    if (user.role === 'vendor' || user.role === 'admin') {
      throw new ApiError(400, 'User is already a vendor or admin');
    }

    // Check if user already has a pending vendor request
    const existingRequest = await VendorVerification.findOne({
      userId: user._id,
      status: 'pending',
    });
    if (existingRequest) {
      throw new ApiError(400, 'You already have a pending vendor application');
    }

    // Update user with vendor information (use existing user's name/email/phone if not provided)
    user.businessName = businessName;
    user.gstNumber = gstNumber;
    user.aadharNumber = aadharNumber;
    user.panNumber = panNumber;
    user.vendorStatus = 'pending';
    // Update name/email/phone only if provided in the request
    if (rest.name) user.name = rest.name;
    if (rest.email) user.email = rest.email;
    if (rest.phone) user.phone = rest.phone;
    // Don't change role yet - it will be changed when admin approves
    await user.save();
  } else {
    // Create new user - password is required when creating a new account
    // Only require password if we're actually creating a new user (not using existing account)
    if (!password || (typeof password === 'string' && password.trim().length < 6)) {
      throw new ApiError(400, 'Password is required and must be at least 6 characters long when creating a new account');
    }

    const newUser = await registerCustomer({
      ...rest,
    });

    newUser.role = 'vendor';
    newUser.businessName = businessName;
    newUser.gstNumber = gstNumber;
    newUser.aadharNumber = aadharNumber;
    newUser.panNumber = panNumber;
    newUser.vendorStatus = 'pending';
    newUser.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await newUser.save();

    user = newUser;
  }

  // Create vendor verification request
  await VendorVerification.create({
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
    await sendMail({
      to: user.email,
      subject: 'Vendor application received',
      html: `<p>Hi ${user.name},</p><p>We have received your vendor application. Our team will review it and notify you once it is approved.</p>`,
    });
  }

  return user;
};

export const loginWithPassword = async ({
  identifier,
  role,
  password,
}: PasswordLoginInput, context?: { userAgent?: string; ipAddress?: string }): Promise<{
  user: UserDocument;
  tokens: TokenPair;
}> => {
  const query: Record<string, unknown> = {
    isDeleted: false,
  };

  if (identifier.includes('@')) {
    query.email = identifier;
  } else {
    query.phone = identifier;
  }

  if (role) {
    query.role = role;
  }

  const user = await User.findOne(query);
  if (!user || !user.passwordHash) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (user.role === 'vendor' && user.vendorStatus !== 'active') {
    throw new ApiError(403, `Vendor account is ${user.vendorStatus}. Please contact support.`);
  }

  const sessionExpiry = getRefreshExpiryDate();
  const session = new Session({
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

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  return {
    user,
    tokens: pair,
  };
};

export const loginWithFirebase = async (
  { firebaseToken, role = 'customer', name, email }: FirebaseLoginInput,
  context?: { userAgent?: string; ipAddress?: string },
): Promise<{ user: UserDocument; tokens: TokenPair }> => {
  const decoded = await verifyFirebaseIdToken(firebaseToken);
  
  // Google OAuth provides email, name, and picture
  const tokenEmail = decoded.email;
  const tokenName = decoded.name;
  const tokenPicture = decoded.picture;
  const provider = decoded.firebase?.sign_in_provider || 'google.com';
  const firebaseUid = decoded.uid;

  // Require email for Google OAuth
  if (!tokenEmail && !email) {
    throw new ApiError(400, 'Firebase token does not contain email. Google OAuth requires an email address.');
  }

  const finalEmail = email || tokenEmail;
  const finalName = name || tokenName || 'User';
  const isEmailVerified = Boolean(decoded.email_verified) || true; // Google emails are verified

  // Search for existing user by email OR Firebase UID (in case email changed)
  let user = await User.findOne({
    $or: [
      { email: finalEmail },
      { 'meta.firebaseUid': firebaseUid },
    ],
    isDeleted: false,
  });

  // Block admin registration through Firebase (but allow existing admin to login)
  if (role === 'admin') {
    throw new ApiError(403, 'Admin registration is not available through this endpoint');
  }

  if (!user) {
    // Create new user with Google OAuth data - sync all data to MongoDB
    logger.info('Creating new user from Google OAuth', { email: finalEmail, name: finalName, firebaseUid });
    user = await User.create({
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
    logger.info('User created successfully in MongoDB', { userId: user._id, email: finalEmail });
  } else {
    // Update existing user with latest Google OAuth data - sync to MongoDB
    const updateData: Partial<IUser> = {};
    const metaUpdate: Record<string, unknown> = {
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
    } else if (!user.email && finalEmail) {
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
    logger.info('User data synced from Google OAuth to MongoDB', { 
      userId: user._id, 
      email: finalEmail,
      updates: Object.keys(updateData),
      hasPicture: !!tokenPicture,
    });
  }

  if (user.role === 'vendor' && user.vendorStatus !== 'active') {
    throw new ApiError(403, `Vendor account is ${user.vendorStatus}. Please contact support.`);
  }

  const sessionExpiry = getRefreshExpiryDate();
  const session = new Session({
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

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  return {
    user,
    tokens: pair,
  };
};

export const registerWithFirebase = async (
  input: FirebaseRegisterInput,
  context?: { userAgent?: string; ipAddress?: string },
) => {
  const result = await loginWithFirebase(input, context);

  const { profile } = input;
  if (profile?.email && result.user.email !== profile.email) {
    await ensureIdentifiersAreFree(profile.email, undefined, result.user.id);
    result.user.email = profile.email;
    result.user.isEmailVerified = false;
    await result.user.save();
  }

  return result;
};

export const resetPasswordWithFirebase = async ({
  firebaseToken,
  newPassword,
}: FirebasePasswordResetInput) => {
  const decoded = await verifyFirebaseIdToken(firebaseToken);
  const email = decoded.email;

  if (!email) {
    throw new ApiError(400, 'Firebase token does not contain email');
  }

  const user = await User.findOne({ email, isDeleted: false });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.isEmailVerified = user.isEmailVerified || Boolean(decoded.email_verified);
  await user.save();

  await Session.deleteMany({ user: user._id });

  return user;
};

export const refreshAuthTokens = async (
  refreshToken: string,
  context?: { userAgent?: string; ipAddress?: string },
): Promise<{ user: UserDocument; tokens: TokenPair }> => {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as jwt.JwtPayload;
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const sessionId = payload.sessionId;
  if (!sessionId) {
    throw new ApiError(401, 'Invalid session');
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(401, 'Session not found');
  }

  const hashed = hashValue(refreshToken);
  if (hashed !== session.refreshTokenHash) {
    throw new ApiError(401, 'Refresh token mismatch');
  }

  if (dayjs().isAfter(dayjs(session.expiresAt))) {
    await session.deleteOne();
    throw new ApiError(401, 'Session expired');
  }

  const user = await User.findById(session.user);
  if (!user || user.isDeleted) {
    throw new ApiError(401, 'User not found');
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

export const logout = async (refreshToken: string) => {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as jwt.JwtPayload;
  } catch {
    return;
  }

  if (!payload.sessionId) {
    return;
  }
  await Session.deleteOne({ _id: payload.sessionId });
};

export const requestPasswordReset = async (email: string) => {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashValue(rawToken);

  const expiresAt = dayjs().add(1, 'hour').toDate();

  await PasswordResetToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${config.app.baseUrl}/auth/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

  await sendMail({
    to: email,
    subject: 'Reset your password',
    html: `<p>Hi ${user.name},</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  });
};

export const resetPassword = async (email: string, token: string, newPassword: string) => {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) {
    throw new ApiError(400, 'Invalid password reset request');
  }

  const tokenHash = hashValue(token);

  const record = await PasswordResetToken.findOne({
    user: user._id,
    tokenHash,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    throw new ApiError(400, 'Invalid or expired password reset token');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  record.usedAt = new Date();
  await record.save();

  await Session.deleteMany({ user: user._id });
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await User.findById(userId);
  if (!user || !user.passwordHash) {
    throw new ApiError(404, 'User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  await Session.deleteMany({ user: user._id });
};

export const approveVendor = async (vendorId: string, adminId: string) => {
  const user = await User.findById(vendorId);
  if (!user) {
    throw new ApiError(404, 'Vendor not found');
  }

  // Update user role to vendor and set status to active
  user.role = 'vendor';
  user.vendorStatus = 'active';
  await user.save();

  await VendorVerification.findOneAndUpdate(
    { userId: user._id },
    { status: 'approved', reviewedBy: adminId, reviewedAt: new Date() },
  );

  if (user.email) {
    await sendMail({
      to: user.email,
      subject: 'Vendor application approved',
      html: `<p>Hi ${user.name},</p><p>Your vendor account has been approved. You can now log in and start managing your products.</p>`,
    });
  }
};

export const rejectVendor = async (vendorId: string, adminId: string, reason?: string) => {
  const user = await User.findById(vendorId);
  if (!user) {
    throw new ApiError(404, 'Vendor not found');
  }

  user.vendorStatus = 'rejected';
  await user.save();

  await VendorVerification.findOneAndUpdate(
    { userId: user._id },
    {
      status: 'rejected',
      adminNotes: reason,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  );

  if (user.email) {
    await sendMail({
      to: user.email,
      subject: 'Vendor application rejected',
      html: `<p>Hi ${user.name},</p><p>We are unable to approve your vendor application at this time.${
        reason ? ` Reason: ${reason}` : ''
      }</p>`,
    });
  }
};

export const serializeUser = (user: UserDocument) => ({
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

export const verifyUniqueIdentifiers = ensureIdentifiersAreFree;

export default {
  registerCustomer,
  registerVendor,
  registerWithFirebase,
  loginWithPassword,
  loginWithFirebase,
  refreshAuthTokens,
  logout,
  requestPasswordReset,
  resetPassword,
  resetPasswordWithFirebase,
  changePassword,
  approveVendor,
  rejectVendor,
  serializeUser,
  verifyUniqueIdentifiers,
};

