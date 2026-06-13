const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { paginatedResponse } = require('../utils/apiResponse');
const {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  searchMovies,
} = require('../services/movieService');

// @desc    Get all movies with filtering, search, sorting, and pagination
// @route   GET /api/movies  |  GET /api/v1/movies
// @access  Public
//
// Query params:
//   page, limit, genre, language, moodTag, status, releaseYear,
//   minRating, search, sortBy

const getMovies = asyncHandler(async (req, res) => {
  const { movies, total, page, limit } = await getAllMovies(req.query);

  res.status(200).json({
    success: true,
    message: 'Movies retrieved successfully.',
    data: paginatedResponse(
      movies.map((m) => m.toSummary()),
      total,
      page,
      limit
    ),
  });
});

// @desc    Get a single movie with its reviews
// @route   GET /api/movies/:id  |  GET /api/v1/movies/:id
// @access  Public

const getMovie = asyncHandler(async (req, res) => {
  const movie = await getMovieById(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Movie retrieved successfully.',
    data: {
      movie: {
        ...movie.toDetail(),
        reviews: movie.reviews ?? [],
      },
    },
  });
});

// @desc    Create a new movie
// @route   POST /api/movies  |  POST /api/v1/movies
// @access  Private — Admin only

const createMovieHandler = asyncHandler(async (req, res) => {
  const movie = await createMovie(req.body);

  res.status(201).json({
    success: true,
    message: 'Movie created successfully.',
    data: { movie: movie.toDetail() },
  });
});

// @desc    Update a movie (partial update — only sent fields change)
// @route   PUT /api/movies/:id  |  PUT /api/v1/movies/:id
// @access  Private — Admin only

const updateMovieHandler = asyncHandler(async (req, res) => {
  const movie = await updateMovie(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Movie updated successfully.',
    data: { movie: movie.toDetail() },
  });
});

// @desc    Delete a movie
// @route   DELETE /api/movies/:id  |  DELETE /api/v1/movies/:id
// @access  Private — Admin only
const deleteMovieHandler = asyncHandler(async (req, res) => {
  await deleteMovie(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Movie deleted successfully.',
    data: null,
  });
});

// @desc    Get personalised movie recommendations (mood + genre aware)
// @route   GET /api/v1/movies/recommendations
// @access  Private

const getRecommendations = asyncHandler(async (req, res) => {
  const Movie = require('../models/Movie');
  const { getLatestMoodByUserId } = require('../services/moodService');

  const genres = req.user.preferences?.genres || [];
  let moodFilter = {};

  // Enrich with the user's latest mood if available
  try {
    const latestMood = await getLatestMoodByUserId(req.user._id.toString());
    moodFilter = { moodTags: latestMood.mood };
  } catch (_) {
    // No mood on record — fall back to genre-only recommendations
  }

  const baseFilter = {
    _id: { $nin: req.user.watchlist || [] },
    ...(genres.length && { genres: { $in: genres } }),
  };

  // Try mood-aware query first; fall back to genre-only if no results
  let movies = await Movie.find({ ...baseFilter, ...moodFilter })
    .sort('-rating.average -rating.count')
    .limit(20);

  if (!movies.length && Object.keys(moodFilter).length) {
    movies = await Movie.find(baseFilter)
      .sort('-rating.average -rating.count')
      .limit(20);
  }

  res.status(200).json({
    success: true,
    message: 'Recommendations retrieved successfully.',
    data: { movies: movies.map((m) => m.toSummary()) },
  });
});

// @desc    Search and filter movies
// @route   GET /api/movies/search  |  GET /api/v1/movies/search
// @access  Public
//
// All parameters are optional individually; at least one must be supplied.
//
// Query params:
//   title       – partial title match (case-insensitive)
//   genre       – one or more genres: "Action" | "Action,Comedy" | genre[]=…
//   mood        – mood tag exact match (Happy | Sad | Relaxed | …)
//   rating      – minimum average rating (0–10)
//   releaseYear – exact release year
//   yearFrom    – release year range start (use with yearTo)
//   yearTo      – release year range end   (use with yearFrom)
//   language    – full name ("English") or BCP-47 code ("en")
//   keyword     – partial match inside keywords array
//   page        – page number (default 1)
//   limit       – results per page (default 20, max 100)
//   sortBy      – sort field (default -rating.average)

/** Search parameters that count as active filters. */
const SEARCH_PARAMS = [
  'title', 'genre', 'mood', 'rating',
  'releaseYear', 'yearFrom', 'yearTo',
  'language', 'keyword',
];

const searchMoviesHandler = asyncHandler(async (req, res, next) => {
  // Require at least one search dimension — prevents accidental full-table scans
  const hasFilter = SEARCH_PARAMS.some(
    (p) => req.query[p] !== undefined && req.query[p] !== ''
  );

  if (!hasFilter) {
    return next(
      new AppError(
        `Provide at least one search parameter: ${SEARCH_PARAMS.join(', ')}.`,
        400
      )
    );
  }

  const { movies, total, page, limit, appliedFilters, activeFilterCount } =
    await searchMovies(req.query);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    message:
      total > 0
        ? `Found ${total} movie${total === 1 ? '' : 's'} matching your search.`
        : 'No movies found matching your search criteria.',
    data: {
      results: movies.map((m) => m.toSummary()),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      appliedFilters,
      activeFilterCount,
    },
  });
});

module.exports = {
  getMovies,
  getMovie,
  createMovie: createMovieHandler,
  updateMovie: updateMovieHandler,
  deleteMovie: deleteMovieHandler,
  getRecommendations,
  searchMovies: searchMoviesHandler,
};
