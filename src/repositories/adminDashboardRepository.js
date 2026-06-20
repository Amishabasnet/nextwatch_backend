const User = require('../models/User');
const Movie = require('../models/Movie');
const Rating = require('../models/Rating');
const Mood = require('../models/Mood');
const History = require('../models/History');
const Feature = require('../models/Feature');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const AdminDashboardRepository = {

  async countUsers() {
    return User.countDocuments();
  },

  async countMovies() {
    return Movie.countDocuments();
  },

  async countRatings() {
    return Rating.countDocuments();
  },

  async getMostSelectedMood() {
    const results = await Mood.aggregate([
      { $group: { _id: '$mood', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (results.length === 0) {
      return { mood: null, count: 0, breakdown: [] };
    }

    return {
      mood: results[0]._id,
      count: results[0].count,
      breakdown: results.map((r) => ({ mood: r._id, count: r.count })),
    };
  },

  async getMostWatchedGenre() {
    const results = await History.aggregate([
      {
        $lookup: {
          from: 'movies',
          localField: 'movie',
          foreignField: '_id',
          as: 'movieDetails',
        },
      },
      { $unwind: '$movieDetails' },
      { $unwind: '$movieDetails.genres' },
      { $group: { _id: '$movieDetails.genres', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (results.length === 0) {
      return { genre: null, count: 0, breakdown: [] };
    }

    return {
      genre: results[0]._id,
      count: results[0].count,
      breakdown: results.map((r) => ({ genre: r._id, count: r.count })),
    };
  },

  async getMostRecommendedMovies(limit = 5) {
    const [featuredMovies, topRatedMovies] = await Promise.all([
      Feature.find({ isActive: true })
        .populate('movie', 'title posterUrl genres averageScore releaseYear')
        .sort({ priority: -1 })
        .limit(limit),

      Rating.aggregate([
        {
          $group: {
            _id: '$movieId',
            avgRating: { $avg: '$rating' },
            ratingCount: { $sum: 1 },
          },
        },
        { $match: { ratingCount: { $gte: 1 } } },
        { $sort: { avgRating: -1, ratingCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'movies',
            localField: '_id',
            foreignField: '_id',
            as: 'movieDetails',
          },
        },
        { $unwind: '$movieDetails' },
      ]),
    ]);

    return {
      featured: featuredMovies
        .filter((f) => f.movie) // guard against orphaned references
        .map((f) => ({
          movieId: f.movie._id,
          title: f.movie.title,
          posterUrl: f.movie.posterUrl,
          genres: f.movie.genres,
          releaseYear: f.movie.releaseYear,
          source: 'admin_featured',
          priority: f.priority,
        })),

      topRatedByUsers: topRatedMovies.map((r) => ({
        movieId: r._id,
        title: r.movieDetails.title,
        posterUrl: r.movieDetails.posterUrl,
        genres: r.movieDetails.genres,
        releaseYear: r.movieDetails.releaseYear,
        source: 'top_rated',
        averageRating: Math.round(r.avgRating * 10) / 10,
        ratingCount: r.ratingCount,
      })),
    };
  },

  async getUserEngagementSummary(totalUsers) {
    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    const [
      activeMoodUserIds,
      activeRatingUserIds,
      activeHistoryUserIds,
      totalRatingsCount,
      totalHistoryCount,
      recentMoodLogs,
      recentRatings,
      recentHistoryEntries,
    ] = await Promise.all([
      Mood.distinct('user', { createdAt: { $gte: since } }),
      Rating.distinct('userId', { createdAt: { $gte: since } }),
      History.distinct('user', { watchedAt: { $gte: since } }),
      Rating.countDocuments(),
      History.countDocuments(),
      Mood.countDocuments({ createdAt: { $gte: since } }),
      Rating.countDocuments({ createdAt: { $gte: since } }),
      History.countDocuments({ watchedAt: { $gte: since } }),
    ]);

    const activeUserSet = new Set([
      ...activeMoodUserIds.map((id) => id.toString()),
      ...activeRatingUserIds.map((id) => id.toString()),
      ...activeHistoryUserIds.map((id) => id.toString()),
    ]);

    const activeUsers = activeUserSet.size;
    const avgRatingsPerUser = totalUsers > 0 ? Math.round((totalRatingsCount / totalUsers) * 100) / 100 : 0;
    const avgHistoryEntriesPerUser =
      totalUsers > 0 ? Math.round((totalHistoryCount / totalUsers) * 100) / 100 : 0;
    const engagementRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 1000) / 10 : 0;

    return {
      activeUsersLast30Days: activeUsers,
      engagementRatePercent: engagementRate,
      avgRatingsPerUser,
      avgHistoryEntriesPerUser,
      recentActivityLast30Days: {
        moodLogs: recentMoodLogs,
        ratings: recentRatings,
        historyEntries: recentHistoryEntries,
      },
    };
  },
};

module.exports = AdminDashboardRepository;
