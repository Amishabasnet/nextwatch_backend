const AuthService = require('../services/authService');
const { apiResponse } = require('../types/express.types');

const AuthController = {
  async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json(apiResponse(true, 'Registration successful', result));
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json(apiResponse(true, 'Login successful', result));
    } catch (error) {
      next(error);
    }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      res.status(200).json(apiResponse(true, 'Token refreshed', result));
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(req.user._id, refreshToken);
      res.status(200).json(apiResponse(true, 'Logged out successfully', null));
    } catch (error) {
      next(error);
    }
  },

  async getProfile(req, res, next) {
    try {
      const result = await AuthService.getProfile(req.user._id);
      res.status(200).json(apiResponse(true, 'Profile fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const { name, email, phone } = req.body;
      const result = await AuthService.updateProfile(req.user._id, { name, email, phone });
      res.status(200).json(apiResponse(true, 'Profile updated', result));
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user._id, { currentPassword, newPassword });
      res.status(200).json(apiResponse(true, 'Password updated successfully', result));
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      res.status(200).json(apiResponse(true, result.message, result));
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      const result = await AuthService.resetPassword(token, password);
      res.status(200).json(apiResponse(true, result.message, result));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AuthController;
