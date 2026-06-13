const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const watchlistSvc = require('../services/watchlistService');

// Add a movie to the currently logged-in user's watchlist
const addToWatchlist = asyncHandler(async (req, res) => {
  const { entry, movie } = await watchlistSvc.addToWatchlist({
    userId: req.user._id,
    movieId: req.body.movieId,
  });

  res.status(201).json({
    success: true,
    message: `"${movie.title}" added to your watchlist.`,
    data: {
      entry: {
        _id: entry._id,
        savedAt: entry.savedAt,
        createdAt: entry.createdAt,
        movie: movie.toSummary(),
      },
    },
  });
});

// Get a user's watchlist with pagination
const getUserWatchlist = asyncHandler(async (req, res, next) => {
  // Regular users can only view their own watchlist.
  // An admin is allowed to view any user's watchlist.
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to view this watchlist.', 403)
    );
  }

  const { entries, total, page, limit } =
    await watchlistSvc.getWatchlist(
      req.params.userId,
      req.query
    );

  // Work out the total number of available pages
  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    message:
      total > 0
        ? 'Watchlist retrieved successfully.'
        : 'Your watchlist is empty.',
    data: {
      results: entries.map((entry) => entry.toSummary()),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
});

// Remove a movie from the logged-in user's watchlist
const removeFromWatchlist = asyncHandler(async (req, res) => {
  // The user ID comes from the login token so users cannot edit another watchlist
  await watchlistSvc.removeFromWatchlist({
    userId: req.user._id,
    movieId: req.params.movieId,
  });

  res.status(200).json({
    success: true,
    message: 'Movie removed from your watchlist.',
    data: null,
  });
});

module.exports = { addToWatchlist, getUserWatchlist, removeFromWatchlist,};