const Movie = require('../models/Movie');

const MovieRepository = {
  async create(data) {
    return Movie.create(data);
  },

  async findById(id) {
    return Movie.findById(id);
  },

  async findAll({ page = 1, limit = 10, filters = {} } = {}) {
    const skip = (page - 1) * limit;
    const [movies, total] = await Promise.all([
      Movie.find(filters).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Movie.countDocuments(filters),
    ]);
    return { movies, total };
  },

  async search(query) {
    return Movie.find({ $text: { $search: query } }).limit(20);
  },

  async findByGenres(genres) {
    return Movie.find({ genres: { $in: genres } }).limit(20);
  },

  async findByMoods(moods) {
    return Movie.find({ moods: { $in: moods } }).limit(20);
  },

  async update(id, data) {
    return Movie.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  async delete(id) {
    return Movie.findByIdAndDelete(id);
  },
};

module.exports = MovieRepository;
