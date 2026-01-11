import { Request, Response, NextFunction } from 'express';

import {
  approveVendor,
  changePassword,
  loginWithFirebase,
  loginWithPassword,
  logout,
  refreshAuthTokens,
  registerCustomer,
  registerVendor,
  registerWithFirebase,
  rejectVendor,
  requestPasswordReset,
  resetPassword,
  resetPasswordWithFirebase,
  serializeUser,
} from '../services/auth.service';

export const registerCustomerHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await registerCustomer(req.body);
    res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const registerVendorHandler = async (req: Request, res: Response, next: NextFunction) => {
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
    
    const user = await registerVendor(req.body, existingUserId);
    res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const passwordLoginHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokens, user } = await loginWithPassword(
      req.body,
      {
        userAgent: req.get('user-agent') || undefined,
        ipAddress: req.ip,
      },
    );

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ accessToken: tokens.accessToken, user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const firebaseLoginHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokens, user } = await loginWithFirebase(
      req.body,
      {
        userAgent: req.get('user-agent') || undefined,
        ipAddress: req.ip,
      },
    );

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ accessToken: tokens.accessToken, user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const refreshHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token missing' });
    }

    const { tokens, user } = await refreshAuthTokens(refreshToken, {
      userAgent: req.get('user-agent') || undefined,
      ipAddress: req.ip,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ accessToken: tokens.accessToken, user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const logoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      await logout(refreshToken);
    }
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requestPasswordReset(req.body.email);
    res.status(200).json({ message: 'If the email exists, password reset instructions have been sent.' });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, token, password } = req.body;
    await resetPassword(email, token, password);
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

export const changePasswordHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    res.status(200).json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
};

export const approveVendorHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await approveVendor(req.params.vendorId, req.user!.id);
    res.status(200).json({ message: 'Vendor approved' });
  } catch (error) {
    next(error);
  }
};

export const rejectVendorHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rejectVendor(req.params.vendorId, req.user!.id, req.body.reason);
    res.status(200).json({ message: 'Vendor rejected' });
  } catch (error) {
    next(error);
  }
};

export const getVendorApplicationStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new Error('Authentication required');
    }

    const { getVendorApplicationStatus } = await import('../services/auth.service');
    const application = await getVendorApplicationStatus(req.user._id.toString());

    res.json({ application });
  } catch (error) {
    next(error);
  }
};

export const profileHandler = async (req: Request, res: Response) => {
  res.status(200).json({ user: serializeUser(req.user!) });
};

export const registerWithFirebaseHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokens, user } = await registerWithFirebase(
      req.body,
      {
        userAgent: req.get('user-agent') || undefined,
        ipAddress: req.ip,
      },
    );

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ accessToken: tokens.accessToken, user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordWithFirebaseHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firebaseToken, password } = req.body;
    await resetPasswordWithFirebase({ firebaseToken, newPassword: password });
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

export default {
  registerCustomerHandler,
  registerVendorHandler,
  registerWithFirebaseHandler,
  passwordLoginHandler,
  firebaseLoginHandler,
  refreshHandler,
  logoutHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  resetPasswordWithFirebaseHandler,
  changePasswordHandler,
  approveVendorHandler,
  rejectVendorHandler,
  profileHandler,
  getVendorApplicationStatusHandler,
};

