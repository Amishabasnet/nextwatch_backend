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
      const result = await AuthService.updateProfile(req.user._id, req.body);
      res.status(200).json(apiResponse(true, 'Profile updated', result));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AuthController;
