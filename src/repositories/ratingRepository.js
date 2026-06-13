const Rating = require('../models/Rating');

const RatingRepository = {

  async create(data) {
    return Rating.create(data);
  },

  async findById(id) {
    return Rating.findById(id);
  },

  async findByUserAndMovie(userId, movieId) {
    return Rating.findOne({ userId, movieId });
  },

  async findByMovie(movieId) {
    return Rating.find({ movieId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
  },

  async findByUser(userId) {
    return Rating.find({ userId })
      .populate('movieId', 'title posterUrl genres contentType releaseYear')
      .sort({ createdAt: -1 });
  },

  async update(id, data) {
    return Rating.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  },

  async delete(id) {
    return Rating.findByIdAndDelete(id);
  },

  async getAverageForMovie(movieId) {
    const result = await Rating.aggregate([
      { $match: { movieId: movieId } },
      { $group: { _id: '$movieId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    return result[0] || { avg: 0, count: 0 };
  },

  async getLikedMovieIds(userId) {
    const ratings = await Rating.find({ userId, liked: true }).select('movieId');
    return ratings.map((r) => r.movieId);
  },

  async getDislikedMovieIds(userId) {
    const ratings = await Rating.find({ userId, disliked: true }).select('movieId');
    return ratings.map((r) => r.movieId);
  },

  async getHighScoredRatings(userId, threshold = 7) {
    return Rating.find({ userId, rating: { $gte: threshold } })
      .populate('movieId', 'genres moods')
      .select('movieId rating');
  },
};

module.exports = RatingRepository;
