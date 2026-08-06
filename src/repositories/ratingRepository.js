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

  // Platform-wide (user_id, movie_id, rating) triples for every user,
  // used to build the collaborative-filtering user-item matrix. Only
  // ratings with a numeric score matter here — a bare "liked"/"disliked"
  // flag with no star rating isn't useful for item-item similarity, and
  // the ML service already synthesizes pseudo-ratings for those from the
  // current user's own likedMovieIds/dislikedMovieIds.
  async findAllRatingsForCF() {
    return Rating.find({ rating: { $ne: null, $exists: true } })
      .select('userId movieId rating')
      .lean();
  },
};

module.exports = RatingRepository;
