const History = require('../models/History');

const HistoryRepository = {
  async create(data) {
    return History.create(data);
  },

  async findByUser(userId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      History.find({ user: userId })
        .populate('movie', 'title posterUrl genres contentType releaseYear')
        .skip(skip)
        .limit(limit)
        .sort({ watchedAt: -1 }),
      History.countDocuments({ user: userId }),
    ]);
    return { records, total };
  },

  async findAllByUser(userId, limit = 50) {
    const records = await History.find({ user: userId })
      .populate('movie', 'title genres releaseYear')
      .limit(limit)
      .sort({ watchedAt: -1 });
    return { records, total: records.length };
  },

  async findOne(userId, movieId) {
    return History.findOne({ user: userId, movie: movieId });
  },

  async update(userId, movieId, data) {
    return History.findOneAndUpdate(
      { user: userId, movie: movieId },
      data,
      { new: true, runValidators: true }
    );
  },

  async delete(userId, movieId) {
    return History.findOneAndDelete({ user: userId, movie: movieId });
  },

  async clearAll(userId) {
    return History.deleteMany({ user: userId });
  },

  // Sums each user's watched-movie runtime (minutes) to approximate "screen
  // time". Scoped to a specific set of userIds (e.g. the current admin-panel
  // page) so this stays a single cheap aggregation rather than scanning the
  // whole History collection. Only counts completed watches.
  async getScreenTimeForUsers(userIds) {
    if (!userIds || userIds.length === 0) return {};

    const results = await History.aggregate([
      { $match: { user: { $in: userIds }, completed: true } },
      {
        $lookup: {
          from: 'movies',
          localField: 'movie',
          foreignField: '_id',
          as: 'movieDetails',
        },
      },
      { $unwind: '$movieDetails' },
      {
        $group: {
          _id: '$user',
          totalMinutes: { $sum: { $ifNull: ['$movieDetails.runtimeMinutes', 0] } },
          moviesWatched: { $sum: 1 },
        },
      },
    ]);

    const map = {};
    results.forEach((r) => {
      map[String(r._id)] = {
        screenTimeMinutes: r.totalMinutes,
        moviesWatched: r.moviesWatched,
      };
    });
    return map;
  },
};

module.exports = HistoryRepository;
