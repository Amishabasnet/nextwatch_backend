const Movie = require('../models/Movie');
const AppError = require('../utils/AppError');

// Helpers

/**
 * Fields managed by the system that must never be set by API consumers.
 * rating is written exclusively by the Review system (Review.calcAverageRating).
 */
const PROTECTED_FIELDS = ['rating', '_id', '__v', 'createdAt', 'updatedAt'];

const sanitizeBody = (body) => {
  const safe = { ...body };
  PROTECTED_FIELDS.forEach((f) => delete safe[f]);
  return safe;
};

/**
 * Whitelist of allowed sortBy query values.
 * Prevents arbitrary user-controlled sort injection into MongoDB.
 */
const ALLOWED_SORT_FIELDS = new Set([
  'rating.average', '-rating.average',
  'releaseYear',    '-releaseYear',
  'title',          '-title',
  'duration',       '-duration',
  'createdAt',      '-createdAt',
]);

// getAllMovies
/**
 * Returns a paginated, filtered list of movies.
 *
 * Supported query params:
 *   page        – page number (default 1)
 *   limit       – results per page (default 20, max 100)
 *   genre       – filter by a single genre (case-sensitive enum value)
 *   language    – filter by BCP-47 language code
 *   moodTag     – filter by mood tag (used by the recommendation engine)
 *   status      – 'released' | 'upcoming' | 'in_production'
 *   releaseYear – filter by exact release year
 *   minRating   – minimum rating.average (0–10)
 *   search      – full-text search against title, description, keywords
 *   sortBy      – one of ALLOWED_SORT_FIELDS (default '-rating.average')
 *
 * @param {object} query – req.query
 * @returns {{ movies, total, page, limit }}
 */
const getAllMovies = async (query) => {
  const {
    page = 1,
    limit = 20,
    genre,
    language,
    moodTag,
    status,
    releaseYear,
    minRating,
    search,
    sortBy = '-rating.average',
  } = query;

  // Build filter
  const filter = {};

  if (genre)       filter.genres   = genre;          // enum match
  if (language)    filter.language = language;
  if (moodTag)     filter.moodTags = moodTag;        // array field — $elemMatch not needed for single value
  if (status)      filter.status   = status;
  if (releaseYear) filter.releaseYear = Number(releaseYear);

  if (minRating) {
    const min = parseFloat(minRating);
    if (!isNaN(min)) filter['rating.average'] = { $gte: min };
  }

  if (search) {
    // $text requires the text index defined on title + description + keywords
    filter.$text = { $search: String(search) };
  }

  // Pagination
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(Math.max(1, Number(limit)), 100);
  const skip     = (pageNum - 1) * limitNum;

  // Sort
  const safeSort = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : '-rating.average';

  // Query 
  const [movies, total] = await Promise.all([
    Movie.find(filter)
      .sort(safeSort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v'),
    Movie.countDocuments(filter),
  ]);

  return { movies, total, page: pageNum, limit: limitNum };
};

// getMovieById
/**
 * Fetches a single movie by _id and populates its reviews.
 * Throws 404 if the movie does not exist.
 *
 * @param {string} id – MongoDB ObjectId string
 * @returns {Promise<MovieDocument>}
 */
const getMovieById = async (id) => {
  const movie = await Movie.findById(id)
    .populate({
      path: 'reviews',
      select: 'rating content spoiler user createdAt',
      populate: { path: 'user', select: 'fullName avatar' },
    })
    .select('-__v');

  if (!movie) throw new AppError('Movie not found', 404);

  return movie;
};

// createMovie
/**
 * Creates a new movie document.
 * Protected fields (rating, _id, timestamps) are stripped before insert.
 *
 * @param {object} body – req.body
 * @returns {Promise<MovieDocument>}
 */
const createMovie = async (body) => {
  const safe = sanitizeBody(body);
  const movie = await Movie.create(safe);
  return movie;
};

// updateMovie
/**
 * Partially updates a movie — only fields present in the request body change.
 * Throws 404 if the movie does not exist.
 *
 * PUT semantics for arrays (genres, cast, moodTags, keywords):
 *   The entire array is replaced with the provided value.  Clients that want
 *   to add a single genre must send the full updated array.
 *
 * @param {string} id   – MongoDB ObjectId string
 * @param {object} body – req.body
 * @returns {Promise<MovieDocument>}
 */
const updateMovie = async (id, body) => {
  const safe = sanitizeBody(body);

  const movie = await Movie.findByIdAndUpdate(
    id,
    { $set: safe },
    { new: true, runValidators: true }
  ).select('-__v');

  if (!movie) throw new AppError('Movie not found', 404);

  return movie;
};

// deleteMovie
/**
 * Deletes a movie by _id.
 * Throws 404 if the movie does not exist.
 *
 * Note: associated Review documents are left intact.  If cascade deletion is
 * needed, add a post-remove hook on the MovieSchema or handle it here.
 *
 * @param {string} id – MongoDB ObjectId string
 * @returns {Promise<MovieDocument>} the deleted document
 */
const deleteMovie = async (id) => {
  const movie = await Movie.findByIdAndDelete(id);
  if (!movie) throw new AppError('Movie not found', 404);
  return movie;
};


// searchMovies
const { SUPPORTED_LANGUAGES, LANGUAGE_NAME_TO_CODE } = require('../models/Movie');

/**
 * Escapes special regex metacharacters in user input to prevent ReDoS.
 * "Iron Man (2008)" → "Iron Man \(2008\)"
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Accepts a full English language name or a BCP-47 code and always returns
 * the code for MongoDB filtering.
 * "English" → "en",  "FRENCH" → "fr",  "ko" → "ko"
 */
const resolveLanguageCode = (input) => {
  const normalized = input.toLowerCase().trim();
  if (SUPPORTED_LANGUAGES.includes(normalized)) return normalized;
  return LANGUAGE_NAME_TO_CODE[normalized] ?? normalized;
};

const searchMovies = async (query) => {
  const {
    title,
    genre,
    mood,
    rating,
    releaseYear,
    yearFrom,
    yearTo,
    language,
    keyword,
    page   = 1,
    limit  = 20,
    sortBy = '-rating.average',
  } = query;

  const filter         = {};
  const appliedFilters = {};

  // Title
  // Regex gives partial matching: "aven" matches "Avengers", "Avenue 5", etc.
  // Input is escaped first so special chars are treated as literals.
  if (title?.trim()) {
    filter.title         = { $regex: escapeRegex(title.trim()), $options: 'i' };
    appliedFilters.title = title.trim();
  }

  // Genre
  // Single:           genre=Action
  // Comma-separated:  genre=Action,Comedy
  // Repeated key:     genre[]=Action&genre[]=Comedy  (Express parses as array)
  if (genre) {
    const genres = (Array.isArray(genre) ? genre : genre.split(','))
      .map((g) => g.trim())
      .filter(Boolean);

    filter.genres         = genres.length === 1 ? genres[0] : { $in: genres };
    appliedFilters.genres = genres;
  }

  // Mood tag
  if (mood?.trim()) {
    filter.moodTags     = mood.trim();
    appliedFilters.mood = mood.trim();
  }

  // Rating (minimum threshold ≥)
  // rating=7  →  rating.average >= 7
  if (rating !== undefined && rating !== '') {
    const min = parseFloat(rating);
    if (!isNaN(min)) {
      filter['rating.average']  = { $gte: min };
      appliedFilters.minRating  = min;
    }
  }

  // Release year
  // Exact and range are mutually exclusive; releaseYear takes precedence.
  // releaseYear=2010
  // yearFrom=2000&yearTo=2010
  if (releaseYear) {
    filter.releaseYear         = Number(releaseYear);
    appliedFilters.releaseYear = Number(releaseYear);
  } else if (yearFrom || yearTo) {
    filter.releaseYear = {};
    if (yearFrom) {
      filter.releaseYear.$gte = Number(yearFrom);
      appliedFilters.yearFrom = Number(yearFrom);
    }
    if (yearTo) {
      filter.releaseYear.$lte = Number(yearTo);
      appliedFilters.yearTo   = Number(yearTo);
    }
  }

  // Language
  // Accepts full names ("English", "FRENCH") or BCP-47 codes ("en", "fr").
  if (language?.trim()) {
    const code              = resolveLanguageCode(language.trim());
    filter.language         = code;
    appliedFilters.language = code;
  }

  // Keyword
  // Partial regex against each element of the keywords[] array.
  // MongoDB automatically checks every element — no $elemMatch needed.
  if (keyword?.trim()) {
    filter.keywords         = { $regex: escapeRegex(keyword.trim()), $options: 'i' };
    appliedFilters.keyword  = keyword.trim();
  }

  // Pagination
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(Math.max(1, Number(limit)), 100);
  const skip     = (pageNum - 1) * limitNum;

  // Sort (whitelisted against ALLOWED_SORT_FIELDS)
  const safeSort = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : '-rating.average';

  // Execute both queries in parallel
  const [movies, total] = await Promise.all([
    Movie.find(filter)
      .sort(safeSort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v'),
    Movie.countDocuments(filter),
  ]);

  return {
    movies,
    total,
    page:              pageNum,
    limit:             limitNum,
    appliedFilters,
    activeFilterCount: Object.keys(appliedFilters).length,
  };
};

module.exports = {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  searchMovies,
};
