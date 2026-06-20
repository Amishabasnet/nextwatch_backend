const MLPerformanceService = require('../services/mlPerformanceService');
const { apiResponse } = require('../types/express.types');

const MLPerformanceController = {

  async getMLPerformance(req, res, next) {
    try {
      const result = await MLPerformanceService.getMLPerformance();
      res
        .status(200)
        .json(apiResponse(true, 'ML performance metrics fetched successfully', result));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = MLPerformanceController;
