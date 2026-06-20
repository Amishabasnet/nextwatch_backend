const RecommendationService = require('../services/recommendationService');
const { apiResponse } = require('../types/express.types');

const RecommendationController = {
  async getRecommendations(req, res, next) {
    try {
      const { userId } = req.params;
      const result = await RecommendationService.getRecommendations(userId);

      res.status(200).json(
        apiResponse(true, 'Recommendations fetched successfully', result)
      );
    } catch (error) {
      next(error);
    }
  },
};

module.exports = RecommendationController;
