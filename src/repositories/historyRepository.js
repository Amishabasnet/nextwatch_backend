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
};

module.exports = HistoryRepository;
