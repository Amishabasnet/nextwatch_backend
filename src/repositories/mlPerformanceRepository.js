const RecommendationFeedback = require('../models/RecommendationFeedback');
const Rating = require('../models/Rating');

const MLPerformanceRepository = {

  async getAverageUserRating() {
    const result = await Rating.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    if (!result.length) return { averageRating: 0, totalRatings: 0 };

    return {
      averageRating: Math.round(result[0].averageRating * 100) / 100,
      totalRatings: result[0].totalRatings,
    };
  },

  async getClickThroughRate() {
    const result = await RecommendationFeedback.aggregate([
      {
        $group: {
          _id: null,
          totalShown: { $sum: 1 },
          totalClicked: { $sum: { $cond: ['$clicked', 1, 0] } },
        },
      },
    ]);

    if (!result.length) return { clickThroughRate: 0, totalClicked: 0, totalShown: 0 };

    const { totalShown, totalClicked } = result[0];
    const clickThroughRate =
      totalShown > 0 ? Math.round((totalClicked / totalShown) * 10000) / 100 : 0;

    return { clickThroughRate, totalClicked, totalShown };
  },

  async getMostLikedRecommendations(limit = 10) {
    return RecommendationFeedback.aggregate([
      { $match: { liked: true } },
      {
        $group: {
          _id: '$movieId',
          likeCount: { $sum: 1 },
          totalFeedback: { $sum: 1 },
        },
      },
      { $sort: { likeCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movie',
        },
      },
      { $unwind: '$movie' },
    
      {
        $lookup: {
          from: 'recommendationfeedbacks',
          localField: '_id',
          foreignField: 'movieId',
          as: 'allFeedback',
        },
      },
      {
        $addFields: {
          totalFeedbackForMovie: { $size: '$allFeedback' },
        },
      },
      {
        $project: {
          movieId: '$_id',
          title: '$movie.title',
          genres: '$movie.genres',
          posterUrl: '$movie.posterUrl',
          releaseYear: '$movie.releaseYear',
          likeCount: 1,
          likeRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$likeCount', { $max: ['$totalFeedbackForMovie', 1] }] },
                  100,
                ],
              },
              1,
            ],
          },
        },
      },
    ]);
  },

  async getIrrelevantRecommendations(limit = 10) {
    return RecommendationFeedback.aggregate([
      { $match: { markedIrrelevant: true } },
      {
        $group: {
          _id: '$movieId',
          irrelevantCount: { $sum: 1 },
          reasons: {
            $push: {
              $cond: [
                { $gt: ['$irrelevantReason', null] },
                '$irrelevantReason',
                '$$REMOVE',
              ],
            },
          },
        },
      },
      { $sort: { irrelevantCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movie',
        },
      },
      { $unwind: '$movie' },
      {
        $lookup: {
          from: 'recommendationfeedbacks',
          localField: '_id',
          foreignField: 'movieId',
          as: 'allFeedback',
        },
      },
      {
        $project: {
          movieId: '$_id',
          title: '$movie.title',
          genres: '$movie.genres',
          posterUrl: '$movie.posterUrl',
          releaseYear: '$movie.releaseYear',
          irrelevantCount: 1,
          irrelevantRate: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      '$irrelevantCount',
                      { $max: [{ $size: '$allFeedback' }, 1] },
                    ],
                  },
                  100,
                ],
              },
              1,
            ],
          },
          topReasons: { $slice: ['$reasons', 5] },
        },
      },
    ]);
  },

  async getUserSatisfactionScore() {
    const result = await RecommendationFeedback.aggregate([
      {
        $group: {
          _id: null,
          totalLiked: { $sum: { $cond: ['$liked', 1, 0] } },
          totalDisliked: { $sum: { $cond: ['$disliked', 1, 0] } },
          totalIrrelevant: { $sum: { $cond: ['$markedIrrelevant', 1, 0] } },
        },
      },
    ]);

    if (!result.length) {
      return { satisfactionScore: 0, totalLiked: 0, totalDisliked: 0, totalIrrelevant: 0 };
    }

    const { totalLiked, totalDisliked, totalIrrelevant } = result[0];
    const expressed = totalLiked + totalDisliked;
    const satisfactionScore =
      expressed > 0 ? Math.round((totalLiked / expressed) * 1000) / 10 : 0;

    return { satisfactionScore, totalLiked, totalDisliked, totalIrrelevant };
  },

  async getTotalFeedbackCount() {
    const result = await RecommendationFeedback.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
          liked: { $sum: { $cond: ['$liked', 1, 0] } },
          disliked: { $sum: { $cond: ['$disliked', 1, 0] } },
          markedIrrelevant: { $sum: { $cond: ['$markedIrrelevant', 1, 0] } },
        },
      },
    ]);

    if (!result.length) {
      return { total: 0, clicked: 0, liked: 0, disliked: 0, markedIrrelevant: 0 };
    }

    const { total, clicked, liked, disliked, markedIrrelevant } = result[0];
    return { total, clicked, liked, disliked, markedIrrelevant };
  },

  async getPerformanceTrend(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    return RecommendationFeedback.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          total: { $sum: 1 },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
          liked: { $sum: { $cond: ['$liked', 1, 0] } },
          disliked: { $sum: { $cond: ['$disliked', 1, 0] } },
          markedIrrelevant: { $sum: { $cond: ['$markedIrrelevant', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: 1,
          clicked: 1,
          liked: 1,
          disliked: 1,
          markedIrrelevant: 1,
        },
      },
    ]);
  },
};

module.exports = MLPerformanceRepository;
