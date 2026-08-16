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

  // Related movies for a "You Might Also Like" style rail.
  // Ranks by number of shared genres (desc) then rating (desc), and if
  // there aren't enough genre-matched movies, backfills with top-rated
  // movies (excluding the source movie and anything already picked) so
  // the rail always has a full row instead of just 1-2 items.
  async findRelated(movieId, genres = [], limit = 12) {
    const mongoose = require('mongoose');
    const excludeId = new mongoose.Types.ObjectId(String(movieId));

    let matched = [];
    if (Array.isArray(genres) && genres.length > 0) {
      matched = await Movie.aggregate([
        { $match: { _id: { $ne: excludeId }, genres: { $in: genres } } },
        { $addFields: { matchCount: { $size: { $setIntersection: ['$genres', genres] } } } },
        { $sort: { matchCount: -1, averageScore: -1 } },
        { $limit: limit },
      ]);
      matched = matched.map((m) => new Movie(m));
    }

    if (matched.length < limit) {
      const excludeIds = [excludeId, ...matched.map((m) => m._id)];
      const fillCount = limit - matched.length;
      const filler = await Movie.find({ _id: { $nin: excludeIds } })
        .sort({ averageScore: -1 })
        .limit(fillCount);
      matched = matched.concat(filler);
    }

    return matched;
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
