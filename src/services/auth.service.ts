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

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: rgba(255, 255, 255, 0.2); width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Reset Your Password</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi ${user.name || 'there'},
              </p>
              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding: 0 0 30px;">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 20px; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 13px; line-height: 1.6; margin: 0 0 30px; word-break: break-all; text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                ${resetUrl}
              </p>
              
              <!-- Security Notice -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-top: 30px;">
                <p style="color: #856404; font-size: 13px; line-height: 1.6; margin: 0;">
                  <strong>Security Tip:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 10px;">
                This is an automated email. Please do not reply to this message.
              </p>
              <p style="color: #cccccc; font-size: 12px; line-height: 1.6; margin: 0;">
                &copy; ${new Date().getFullYear()} BazaarWale. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendMail({
    to: email,
    subject: 'Reset Your Password - BazaarWale',
    html: emailHtml,
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

