const RecommendationFeedback = require('../models/RecommendationFeedback');
const RecommendationFeedbackRepository = {
  async logImpressions(userId, items = []) {
    const ops = (items || [])
      .filter((item) => item && item.movieId)
      .map((item) => {
        const systemFields = {};
        if (typeof item.mlScore === 'number') systemFields.mlScore = item.mlScore;
        if (item.recommendationSource) systemFields.recommendationSource = item.recommendationSource;

        return {
          updateOne: {
            filter: { userId, movieId: item.movieId },
            update: {
              $set: systemFields,
              $setOnInsert: { userId, movieId: item.movieId },
            },
            upsert: true,
          },
        };
      });

    if (ops.length === 0) return { count: 0 };

    const result = await RecommendationFeedback.bulkWrite(ops, { ordered: false });
    return { count: (result.upsertedCount || 0) + (result.modifiedCount || 0) };
  },

  async submitFeedback(userId, movieId, data) {
    return RecommendationFeedback.findOneAndUpdate(
      { userId, movieId },
      { $set: data, $setOnInsert: { userId, movieId } },
      { upsert: true, new: true, runValidators: true }
    );
  },

  async findByUserAndMovie(userId, movieId) {
    return RecommendationFeedback.findOne({ userId, movieId });
  },
};

module.exports = RecommendationFeedbackRepository;
