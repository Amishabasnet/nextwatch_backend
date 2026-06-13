const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  getRecommendations,
  searchMovies,
} = require('../controllers/movieController');
const { getReviews, createReview } = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  SUPPORTED_GENRES,
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAME_TO_CODE,
  MOVIE_MOOD_TAGS,
  MOVIE_STATUS,
} = require('../models/Movie');

const router = express.Router();

// Shared validation rules

const movieIdParam = param('id')
  .isMongoId()
  .withMessage('Movie id must be a valid MongoDB ObjectId');

/**
 * Validates a string array against an allowed values list with no duplicates.
 * Returns an optional rule when `required` is false (for PUT).
 */
const enumArrayRule = (field, allowedValues, opts = {}) => {
  const rule = body(field);
  const base = opts.required
    ? rule.isArray({ min: 1 }).withMessage(`${field} must be a non-empty array`)
    : rule.optional().isArray().withMessage(`${field} must be an array`);

  return base.custom((values) => {
    const invalid = values.filter((v) => !allowedValues.includes(v));
    if (invalid.length) {
      throw new Error(
        `${field} contains invalid value(s): ${invalid.join(', ')}. Allowed: ${allowedValues.join(', ')}`
      );
    }
    if (new Set(values).size !== values.length) {
      throw new Error(`${field} must not contain duplicate values`);
    }
    return true;
  });
};

// POST validation (create)

const createRules = [
  // Required
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  enumArrayRule('genres', SUPPORTED_GENRES, { required: true }),

  // Optional scalars
  body('releaseYear')
    .optional()
    .isInt({ min: 1888, max: new Date().getFullYear() + 5 })
    .withMessage(
      `releaseYear must be between 1888 and ${new Date().getFullYear() + 5}`
    ),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('duration must be a positive integer (minutes)'),

  body('director')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('director cannot exceed 100 characters'),

  body('language')
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),

  body('status')
    .optional()
    .isIn(MOVIE_STATUS)
    .withMessage(`status must be one of: ${MOVIE_STATUS.join(', ')}`),

  body('tmdbId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('tmdbId must be a positive integer'),

  // URL fields
  body('posterUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('posterUrl must be a valid URL'),

  body('trailerUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('trailerUrl must be a valid URL'),

  body('backdropUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('backdropUrl must be a valid URL'),

  // Array fields
  enumArrayRule('moodTags', MOVIE_MOOD_TAGS),

  body('keywords')
    .optional()
    .isArray()
    .withMessage('keywords must be an array')
    .custom((kws) => {
      if (!kws.every((k) => typeof k === 'string' && k.trim().length > 0)) {
        throw new Error('Each keyword must be a non-empty string');
      }
      return true;
    }),

  // Nested cast array
  body('cast')
    .optional()
    .isArray()
    .withMessage('cast must be an array'),

  body('cast.*.name')
    .if(body('cast').exists())
    .trim()
    .notEmpty()
    .withMessage('Each cast member must have a name'),

  body('cast.*.character')
    .optional()
    .isString()
    .withMessage('cast.character must be a string'),

  body('cast.*.profileUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('cast.profileUrl must be a valid URL'),
];

// PUT validation (update — all fields optional)
// Re-uses the same rules with optional() applied at the field level.

const updateRules = [
  movieIdParam,

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be blank')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be blank')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  enumArrayRule('genres', SUPPORTED_GENRES),

  body('releaseYear')
    .optional()
    .isInt({ min: 1888, max: new Date().getFullYear() + 5 })
    .withMessage(
      `releaseYear must be between 1888 and ${new Date().getFullYear() + 5}`
    ),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('duration must be a positive integer (minutes)'),

  body('director')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('director cannot exceed 100 characters'),

  body('language')
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),

  body('status')
    .optional()
    .isIn(MOVIE_STATUS)
    .withMessage(`status must be one of: ${MOVIE_STATUS.join(', ')}`),

  body('tmdbId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('tmdbId must be a positive integer'),

  body('posterUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('posterUrl must be a valid URL'),

  body('trailerUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('trailerUrl must be a valid URL'),

  body('backdropUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('backdropUrl must be a valid URL'),

  enumArrayRule('moodTags', MOVIE_MOOD_TAGS),

  body('keywords')
    .optional()
    .isArray()
    .withMessage('keywords must be an array')
    .custom((kws) => {
      if (!kws.every((k) => typeof k === 'string' && k.trim().length > 0)) {
        throw new Error('Each keyword must be a non-empty string');
      }
      return true;
    }),

  body('cast')
    .optional()
    .isArray()
    .withMessage('cast must be an array'),

  body('cast.*.name')
    .if(body('cast').exists())
    .trim()
    .notEmpty()
    .withMessage('Each cast member must have a name'),

  body('cast.*.character')
    .optional()
    .isString(),

  body('cast.*.profileUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('cast.profileUrl must be a valid URL'),
];

// GET list validation (optional query param coercion)

const listQueryRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),

  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('minRating must be between 0 and 10'),

  query('releaseYear')
    .optional()
    .isInt({ min: 1888 })
    .withMessage('releaseYear must be a valid year'),

  query('genre')
    .optional()
    .isIn(SUPPORTED_GENRES)
    .withMessage(`genre must be one of: ${SUPPORTED_GENRES.join(', ')}`),

  query('language')
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),

  query('moodTag')
    .optional()
    .isIn(MOVIE_MOOD_TAGS)
    .withMessage(`moodTag must be one of: ${MOVIE_MOOD_TAGS.join(', ')}`),

  query('status')
    .optional()
    .isIn(MOVIE_STATUS)
    .withMessage(`status must be one of: ${MOVIE_STATUS.join(', ')}`),
];

// Routes

/**
 * GET /api/movies
 * List movies with optional filtering, text search, and pagination.
 * Public — no auth required.
 *
 * Query params:
 *   page, limit, genre, language, moodTag, status, releaseYear,
 *   minRating, search, sortBy
 */
router.get('/', listQueryRules, validate, getMovies);

/**
 * GET /api/movies/recommendations
 * Personalised list based on the user's genre preferences + current mood.
 * Must precede /:id to avoid 'recommendations' being treated as an ObjectId.
 */
router.get('/recommendations', protect, getRecommendations);

// Search validation rules 

/**
 * Checks whether a language value is a recognised full name or BCP-47 code.
 * Used as a custom validator so we can accept both "English" and "en".
 */
const isValidLanguage = (value) => {
  const normalized = value.toLowerCase().trim();
  return (
    SUPPORTED_LANGUAGES.includes(normalized) ||
    Object.keys(LANGUAGE_NAME_TO_CODE).includes(normalized)
  );
};

const searchQueryRules = [
  // Title
  query('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('title must be between 1 and 100 characters'),

  // Genre: single value or comma-separated list
  query('genre')
    .optional()
    .custom((value) => {
      const genres = (Array.isArray(value) ? value : value.split(','))
        .map((g) => g.trim())
        .filter(Boolean);

      if (genres.length === 0) throw new Error('genre must not be empty');

      const invalid = genres.filter((g) => !SUPPORTED_GENRES.includes(g));
      if (invalid.length) {
        throw new Error(
          `Invalid genre(s): ${invalid.join(', ')}. ` +
          `Allowed: ${SUPPORTED_GENRES.join(', ')}`
        );
      }
      return true;
    }),

  // Mood tag
  query('mood')
    .optional()
    .isIn(MOVIE_MOOD_TAGS)
    .withMessage(`mood must be one of: ${MOVIE_MOOD_TAGS.join(', ')}`),

  // Rating
  query('rating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('rating must be a number between 0 and 10'),

  // Year (exact)
  query('releaseYear')
    .optional()
    .isInt({ min: 1888 })
    .withMessage('releaseYear must be 1888 or later'),

  // Year range
  query('yearFrom')
    .optional()
    .isInt({ min: 1888 })
    .withMessage('yearFrom must be 1888 or later'),

  query('yearTo')
    .optional()
    .isInt({ min: 1888 })
    .withMessage('yearTo must be 1888 or later')
    .custom((value, { req }) => {
      const from = req.query.yearFrom;
      if (from && Number(value) < Number(from)) {
        throw new Error('yearTo must be greater than or equal to yearFrom');
      }
      return true;
    }),

  // Language 
  // Accepts full names (English, French) or BCP-47 codes (en, fr)
  query('language')
    .optional()
    .isString()
    .custom((value) => {
      if (!isValidLanguage(value)) {
        throw new Error(
          `Unrecognised language "${value}". ` +
          `Use a name (${Object.keys(LANGUAGE_NAME_TO_CODE).map((n) => n[0].toUpperCase() + n.slice(1)).join(', ')}) ` +
          `or a BCP-47 code (${SUPPORTED_LANGUAGES.join(', ')})`
        );
      }
      return true;
    }),

  // Keyword
  query('keyword')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('keyword must be between 1 and 100 characters'),

  // Pagination & sort
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

/**
 * GET /api/movies/search
 * Search and filter movies.  Public — no auth required.
 *
 * At least one of: title, genre, mood, rating, releaseYear,
 *   yearFrom, yearTo, language, keyword
 *
 * Examples:
 *   /api/movies/search?title=iron
 *   /api/movies/search?genre=Action&mood=Excited
 *   /api/movies/search?genre=Action,Comedy&language=English&rating=7
 *   /api/movies/search?yearFrom=2010&yearTo=2020&sortBy=-releaseYear
 *   /api/movies/search?keyword=heist&genre=Thriller
 *
 * Response includes appliedFilters and activeFilterCount metadata.
 *
 * NOTE: declared before /:id so Express does not attempt to cast the
 * literal string "search" as a MongoDB ObjectId.
 */
router.get('/search', searchQueryRules, validate, searchMovies);

/**
 * GET /api/movies/:id
 * Single movie detail including populated reviews.
 * Public — no auth required.
 */
router.get('/:id', [movieIdParam], validate, getMovie);

/**
 * POST /api/movies
 * Create a new movie.
 * Admin only.
 */
router.post('/', protect, restrictTo('admin'), createRules, validate, createMovie);

/**
 * PUT /api/movies/:id
 * Partial update — only supplied fields are changed.
 * Admin only.
 */
router.put('/:id', protect, restrictTo('admin'), updateRules, validate, updateMovie);

/**
 * DELETE /api/movies/:id
 * Remove a movie permanently.
 * Admin only.
 */
router.delete('/:id', protect, restrictTo('admin'), [movieIdParam], validate, deleteMovie);

// Nested review routes

/**
 * GET  /api/movies/:movieId/reviews  — public
 * POST /api/movies/:movieId/reviews  — authenticated users only
 */
router.get('/:movieId/reviews', getReviews);

router.post(
  '/:movieId/reviews',
  protect,
  [
    body('rating')
      .isInt({ min: 1, max: 10 })
      .withMessage('Rating must be an integer between 1 and 10'),
    body('content')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Review content cannot exceed 1000 characters'),
    body('spoiler')
      .optional()
      .isBoolean()
      .withMessage('spoiler must be a boolean'),
  ],
  validate,
  createReview
);

module.exports = router;
