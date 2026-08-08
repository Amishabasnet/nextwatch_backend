const AdminUserService = require('../services/adminUserService');
const { apiResponse } = require('../types/express.types');

const AdminUserController = {
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search, role, status } = req.query;
      const result = await AdminUserService.getAllUsers({
        page: Number(page),
        limit: Number(limit),
        search,
        role,
        status,
      });
      res.status(200).json(apiResponse(true, 'Users fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async getUserById(req, res, next) {
    try {
      const result = await AdminUserService.getUserById(req.params.id);
      res.status(200).json(apiResponse(true, 'User fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async updateRole(req, res, next) {
    try {
      const { role } = req.body;
      const result = await AdminUserService.updateRole(req.user._id, req.params.id, role);
      res.status(200).json(apiResponse(true, 'User role updated', result));
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await AdminUserService.updateStatus(req.user._id, req.params.id, status);
      res.status(200).json(apiResponse(true, 'User status updated', result));
    } catch (error) {
      next(error);
    }
  },

  async deleteUser(req, res, next) {
    try {
      const result = await AdminUserService.deleteUser(req.user._id, req.params.id);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AdminUserController;
