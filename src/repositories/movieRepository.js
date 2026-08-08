const Movie = require('../models/Movie');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MovieRepository = {
  async create(data) {
    return Movie.create(data);
  },

  async findById(id) {
    return Movie.findById(id);
  },

  async findAll({ page = 1, limit = 10, filters = {}, sort = 'createdAt' } = {}) {
    const skip = (page - 1) * limit;
    const sortSpec = sort === 'rating' ? { averageScore: -1 } : { createdAt: -1 };
    const [movies, total] = await Promise.all([
      Movie.find(filters).sort(sortSpec).skip(skip).limit(limit),
      Movie.countDocuments(filters),
    ]);
    return { movies, total };
  },

  // Top N movies platform-wide, ranked purely by average rating — powers
  // the Netflix/Prime-style "Top 10" row on the dashboard.
  async findTopRated(limit = 10) {
    return Movie.find({}).sort({ averageScore: -1 }).limit(limit);
  },

  async search(query) {
    return Movie.find({ $text: { $search: query } }).limit(20);
  },

  async searchWithFilters({ title, keyword, genre, mood, minRating, releaseYear, language, limit = 50 } = {}) {
    const filter = {};
    const andClauses = [];

    // Title — case-insensitive regex
    if (title && title.trim()) {
      filter.title = { $regex: escapeRegex(title.trim()), $options: 'i' };
    }

    // Keyword — search in title + description
    if (keyword && keyword.trim()) {
      const kw = { $regex: escapeRegex(keyword.trim()), $options: 'i' };
      andClauses.push({ $or: [{ title: kw }, { description: kw }] });
    }

    // Genre — match inside genres array (case-insensitive)
    if (genre && genre.trim()) {
      filter.genres = { $regex: new RegExp(`^${escapeRegex(genre.trim())}$`, 'i') };
    }

    // Mood — match inside moods array (case-insensitive)
    if (mood && mood.trim()) {
      filter.moods = { $regex: new RegExp(`^${escapeRegex(mood.trim())}$`, 'i') };
    }

    // Minimum rating
    if (minRating !== undefined && minRating !== '' && !isNaN(Number(minRating))) {
      filter.averageScore = { $gte: Number(minRating) };
    }

    // Release year — exact match
    if (releaseYear && !isNaN(Number(releaseYear))) {
      filter.releaseYear = Number(releaseYear);
    }

    // Language — case-insensitive exact match
    if (language && language.trim()) {
      filter.language = { $regex: new RegExp(`^${escapeRegex(language.trim())}$`, 'i') };
    }

    if (andClauses.length > 0) {
      filter.$and = andClauses;
    }

    return Movie.find(filter).limit(limit).sort({ averageScore: -1 });
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
