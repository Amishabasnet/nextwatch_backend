const Watchlist = require('../models/Watchlist');

const WatchlistRepository = {
  async create(data) {
    return Watchlist.create(data);
  },

  async findOne(userId, movieId) {
    return Watchlist.findOne({ user: userId, movie: movieId });
  },

  async findByUser(userId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      Watchlist.find({ user: userId })
        .populate('movie', 'title posterUrl genres contentType releaseYear averageScore')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Watchlist.countDocuments({ user: userId }),
    ]);
    return { records, total };
  },

  async findMovieIdsByUser(userId) {
    const records = await Watchlist.find({ user: userId }).select('movie');
    return records.map((r) => r.movie);
  },

  async delete(userId, movieId) {
    return Watchlist.findOneAndDelete({ user: userId, movie: movieId });
  },

  async clearAll(userId) {
    return Watchlist.deleteMany({ user: userId });
  },
};

module.exports = WatchlistRepository;
