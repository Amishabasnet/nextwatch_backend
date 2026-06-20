const AdminDashboardService = require('../services/adminDashboardService');
const { apiResponse } = require('../types/express.types');

const AdminDashboardController = {
  async getDashboard(req, res, next) {
    try {
      const result = await AdminDashboardService.getDashboard();
      res.status(200).json(apiResponse(true, 'Admin dashboard data fetched successfully', result));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AdminDashboardController;
