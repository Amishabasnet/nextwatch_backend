const User = require('../models/User');
const Movie = require('../models/Movie');
const Rating = require('../models/Rating');
const Mood = require('../models/Mood');
const History = require('../models/History');
const Feature = require('../models/Feature');
const RecommendationFeedback = require('../models/RecommendationFeedback');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

  async getRecommendationActivityTrend(days = 14) {
    const since = new Date(Date.now() - (days - 1) * ONE_DAY_MS);
    since.setHours(0, 0, 0, 0);

    const results = await RecommendationFeedback.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          clicked: { $sum: { $cond: ['$clicked', 1, 0] } },
          liked: { $sum: { $cond: ['$liked', 1, 0] } },
          disliked: { $sum: { $cond: ['$disliked', 1, 0] } },
          irrelevant: { $sum: { $cond: ['$markedIrrelevant', 1, 0] } },
        },
      },
    ]);

    // Fill every day in the window (even zero-activity days) so the
    // trend line renders a continuous axis instead of skipping gaps.
    const byDate = new Map(results.map((r) => [r._id, r]));
    const data = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = byDate.get(key);
      data.push({
        date: key,
        total: row?.total ?? 0,
        clicked: row?.clicked ?? 0,
        liked: row?.liked ?? 0,
        disliked: row?.disliked ?? 0,
        irrelevant: row?.irrelevant ?? 0,
      });
    }

    return { days, data };
  },

  async getMoodGenreBehaviour(topGenreLimit = 6) {
    // For each watched movie, find the mood the same user logged most
    // recently in the 24h window before they watched it — that's the
    // mood we treat as having "driven" that viewing choice.
    const raw = await History.aggregate([
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
      {
        $lookup: {
          from: 'moods',
          let: { userId: '$user', watchedAt: '$watchedAt' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$userId'] },
                    { $lte: ['$createdAt', '$$watchedAt'] },
                    { $gte: ['$createdAt', { $subtract: ['$$watchedAt', ONE_DAY_MS] }] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'nearestMood',
        },
      },
      { $unwind: '$nearestMood' },
      {
        $group: {
          _id: { mood: '$nearestMood.mood', genre: '$movieDetails.genres' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (raw.length === 0) {
      return { genres: [], data: [] };
    }

    // Cap the number of genre columns so the chart stays readable;
    // anything outside the top N gets folded into "Other".
    const genreTotals = new Map();
    raw.forEach((r) => {
      genreTotals.set(r._id.genre, (genreTotals.get(r._id.genre) || 0) + r.count);
    });
    const topGenres = [...genreTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topGenreLimit)
      .map(([genre]) => genre);
    const topGenreSet = new Set(topGenres);
    const hasOther = genreTotals.size > topGenreLimit;

    const moodMap = new Map();
    raw.forEach((r) => {
      const { mood, genre } = r._id;
      if (!moodMap.has(mood)) {
        moodMap.set(mood, { mood, total: 0 });
      }
      const row = moodMap.get(mood);
      const key = topGenreSet.has(genre) ? genre : 'Other';
      row[key] = (row[key] || 0) + r.count;
      row.total += r.count;
    });

    return {
      genres: hasOther ? [...topGenres, 'Other'] : topGenres,
      data: [...moodMap.values()].sort((a, b) => b.total - a.total),
    };
  },

  // Movies that actually got surfaced by the recommender most often —
  // distinct from getMostRecommendedMovies (which is admin-curated /
  // top-rated). Ranked by how many times a recommendation for that movie
  // was logged, with the click/like/dislike breakdown alongside so the
  // admin can see whether volume is actually landing well.
  async getTopRecommendedMovies(limit = 6) {
    const results = await RecommendationFeedback.aggregate([
      {
        $group: {
          _id: '$movieId',
          recommendedCount: { $sum: 1 },
          clickedCount: { $sum: { $cond: ['$clicked', 1, 0] } },
          likedCount: { $sum: { $cond: ['$liked', 1, 0] } },
          dislikedCount: { $sum: { $cond: ['$disliked', 1, 0] } },
        },
      },
      { $sort: { recommendedCount: -1 } },
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
    ]);

    return results.map((r) => ({
      movieId: r._id,
      title: r.movieDetails.title,
      posterUrl: r.movieDetails.posterUrl,
      genres: r.movieDetails.genres,
      releaseYear: r.movieDetails.releaseYear,
      recommendedCount: r.recommendedCount,
      clickedCount: r.clickedCount,
      likedCount: r.likedCount,
      dislikedCount: r.dislikedCount,
    }));
  },

  // A unified, most-recent-first feed of mood logs, ratings, and watches
  // across all users — pulled from three collections independently (each
  // capped at `limit`) then merged in memory, since the three event types
  // don't share a collection to aggregate over directly.
  async getRecentUserActivity(limit = 10) {
    const [moods, ratings, historyEntries] = await Promise.all([
      Mood.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'name email'),

      Rating.find({ rating: { $ne: null } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .populate('movieId', 'title'),

      History.find({})
        .sort({ watchedAt: -1 })
        .limit(limit)
        .populate('user', 'name email')
        .populate('movie', 'title'),
    ]);

    const events = [];

    moods.forEach((m) => {
      if (!m.user) return; // guard against orphaned references
      events.push({
        type: 'mood',
        userName: m.user.name,
        userEmail: m.user.email,
        mood: m.mood,
        at: m.createdAt,
      });
    });

    ratings.forEach((r) => {
      if (!r.userId || !r.movieId) return;
      events.push({
        type: 'rating',
        userName: r.userId.name,
        userEmail: r.userId.email,
        movieTitle: r.movieId.title,
        rating: r.rating,
        at: r.createdAt,
      });
    });

    historyEntries.forEach((h) => {
      if (!h.user || !h.movie) return;
      events.push({
        type: 'watch',
        userName: h.user.name,
        userEmail: h.user.email,
        movieTitle: h.movie.title,
        at: h.watchedAt,
      });
    });

    return events
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, limit);
  },
};

module.exports = AdminDashboardRepository;
