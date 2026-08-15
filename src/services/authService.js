const User = require('../models/User');
const { generateToken, generateRefreshToken, generateResetToken, verifyResetToken } = require('../config/jwt');
const { toAuthResponseDTO } = require('../dtos/auth.dto');
const { NotFoundError, UnauthorizedError } = require('../errors/appError');

const AuthService = {
  async register({ name, email, phone = '', password, consentGiven = false }) {
    const existing = await User.findOne({ email });
    if (existing) throw new UnauthorizedError('Email already in use');

    const user = await User.create({ name, email, phone, password, consentGiven });

    const token        = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Persist hashed refresh token — load with select('+refreshTokens')
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: refreshToken },
    });

    return toAuthResponseDTO(user, token, refreshToken);
  },

  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new UnauthorizedError('Invalid email or password');

    if (user.status === 'suspended') {
      throw new UnauthorizedError('This account has been suspended. Contact support for help.');
    }

    const token        = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Persist — cap stored tokens at 5 (one per device roughly)
    const userDoc = await User.findById(user._id).select('+refreshTokens');
    const tokens  = userDoc.refreshTokens ?? [];
    const trimmed = tokens.slice(-4); // keep last 4, add the new one → max 5
    await User.findByIdAndUpdate(user._id, {
      $set: { refreshTokens: [...trimmed, refreshToken] },
    });

    return toAuthResponseDTO(user, token, refreshToken);
  },

  async refresh(incomingRefreshToken) {
    if (!incomingRefreshToken) throw new UnauthorizedError('Refresh token required');

    // Verify signature & expiry
    let payload;
    try {
      const { verifyRefreshToken } = require('../config/jwt');
      payload = verifyRefreshToken(incomingRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check token is still stored on the user (rotation check)
    const user = await User.findById(payload.id).select('+refreshTokens');
    if (!user) throw new UnauthorizedError('User not found');

    if (!user.refreshTokens.includes(incomingRefreshToken)) {
      // Token reuse detected — invalidate ALL tokens for this user
      await User.findByIdAndUpdate(payload.id, { $set: { refreshTokens: [] } });
      throw new UnauthorizedError('Refresh token reuse detected — please log in again');
    }

    // Rotate: remove old token, issue new pair
    const newAccessToken  = generateToken({ id: user._id });
    const newRefreshToken = generateRefreshToken({ id: user._id });

    const remaining = user.refreshTokens.filter(t => t !== incomingRefreshToken);
    await User.findByIdAndUpdate(user._id, {
      $set: { refreshTokens: [...remaining, newRefreshToken] },
    });

    return { token: newAccessToken, refreshToken: newRefreshToken };
  },

  async logout(userId, refreshToken) {
    // Remove only this device's refresh token
    if (refreshToken) {
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: refreshToken },
      });
    }
  },

  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async updateProfile(userId, data) {
    const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+password +refreshTokens');
    if (!user) throw new NotFoundError('User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new UnauthorizedError('Current password is incorrect');

    user.password = newPassword; // hashed by the pre('save') hook
    // Invalidate every other logged-in session for this account
    user.refreshTokens = [];
    await user.save();

    return { message: 'Password updated. Please log in again on other devices.' };
  },

  // Step 1 of the reset flow — always resolves with a generic success
  // message regardless of whether the email exists, so callers can't use
  // this endpoint to enumerate registered accounts. If the user *is* found,
  // a short-lived signed token is generated and (in place of a real email
  // provider) logged to the server console / returned in non-production
  // environments so the flow can be exercised end-to-end during development.
  async forgotPassword(email) {
    const user = await User.findOne({ email }).select('+password');
    const genericResult = { message: 'If an account exists for that email, a reset link has been sent.' };
    if (!user) return genericResult;

    const pwdSig = user.password.slice(-10);
    const resetToken = generateResetToken({ id: user._id, pwdSig });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // TODO: wire up a real email provider (e.g. Nodemailer/SendGrid) and
    // send `resetLink` to `user.email` instead of logging it.
    console.log(`[password reset] ${user.email} -> ${resetLink}`);

    if (process.env.NODE_ENV !== 'production') {
      return { ...genericResult, resetToken, resetLink };
    }
    return genericResult;
  },

  // Step 2 — verify the token, confirm it still matches the account's
  // current password hash (i.e. hasn't already been used), then save.
  async resetPassword(token, newPassword) {
    let payload;
    try {
      payload = verifyResetToken(token);
    } catch {
      throw new UnauthorizedError('This reset link is invalid or has expired.');
    }

    const user = await User.findById(payload.id).select('+password +refreshTokens');
    if (!user) throw new NotFoundError('User not found');

    if (user.password.slice(-10) !== payload.pwdSig) {
      throw new UnauthorizedError('This reset link has already been used. Please request a new one.');
    }

    user.password = newPassword; // hashed by the pre('save') hook
    user.refreshTokens = []; // log out every existing session
    await user.save();

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  },
};

module.exports = AuthService;
