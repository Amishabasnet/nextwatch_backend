const RecommendationService = require('../services/recommendationService');
const { apiResponse } = require('../types/express.types');

const VALID_MOODS = [
  'Happy', 'Sad', 'Excited', 'Relaxed', 'Scared',
  'Romantic', 'Motivated', 'Bored', 'Nostalgic',
];

const RecommendationController = {
  async getRecommendations(req, res, next) {
    try {
      const { userId } = req.params;
      const { mood } = req.query;
      const moodOverride = VALID_MOODS.includes(mood) ? mood : null;
      const result = await RecommendationService.getRecommendations(userId, undefined, moodOverride);

      res.status(200).json(
        apiResponse(true, 'Recommendations fetched successfully', result)
      );
    } catch (error) {
      next(error);
    }
  },
};

module.exports = RecommendationController;
