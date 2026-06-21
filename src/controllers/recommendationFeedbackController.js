const RecommendationFeedbackService = require('../services/recommendationFeedbackService');
const { apiResponse } = require('../types/express.types');

const RecommendationFeedbackController = {
  async submitFeedback(req, res, next) {
    try {
      const result = await RecommendationFeedbackService.submitFeedback(req.user._id, req.body);
      res.status(200).json(apiResponse(true, 'Feedback recorded', result));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = RecommendationFeedbackController;
