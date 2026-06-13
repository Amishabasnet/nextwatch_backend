const { Watchlist } = require('../models/Watchlist');
const Movie = require('../models/Movie');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// Movie fields included when watchlist entries are returned
const MOVIE_POPULATE = {
  path: 'movieId',
  select:
    'title genres releaseYear duration rating director language posterUrl moodTags status',
};

// Add a movie to a user's watchlist
const addToWatchlist = async ({ userId, movieId }) => {
  // Make sure the movie exists before saving it
  const movie = await Movie.findById(movieId).select(
    'title genres releaseYear duration rating director language posterUrl moodTags status'
  );

  if (!movie) {
    throw new AppError('Movie not found.', 404);
  }

  // Create a new watchlist entry
  let entry;

  try {
    entry = await Watchlist.create({
      userId,
      movieId,
    });
  } catch (err) {
    // Return an error when the movie is already in the user's watchlist
    if (err.code === 11000) {
      throw new AppError(
        'This movie is already in your watchlist.',
        409
      );
    }

    throw err;
  }

  // Also save the movie ID in the user's watchlist field
  // addToSet prevents the same movie from being added more than once
  await User.findByIdAndUpdate(userId, {
    $addToSet: {
      watchlist: movieId,
    },
  });

  return {
    entry,
    movie,
  };
};

// Get a user's watchlist with pagination
const getWatchlist = async (userId, query = {}) => {
  const {
    page = 1,
    limit = 20,
  } = query;

  // Prepare the page number and number of results to skip
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(
    Math.max(1, Number(limit)),
    100
  );
  const skip = (pageNum - 1) * limitNum;

  // Get the watchlist entries and total count at the same time
  const [entries, total] = await Promise.all([
    Watchlist.find({ userId })
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate(MOVIE_POPULATE),

    Watchlist.countDocuments({ userId }),
  ]);

  return {
    entries,
    total,
    page: pageNum,
    limit: limitNum,
  };
};

// Remove a movie from a user's watchlist
const removeFromWatchlist = async ({ userId, movieId }) => {
  // Check that the movie exists in the database
  const movieExists = await Movie.exists({
    _id: movieId,
  });

  if (!movieExists) {
    throw new AppError('Movie not found.', 404);
  }

  // Delete the matching watchlist entry
  const deleted = await Watchlist.findOneAndDelete({
    userId,
    movieId,
  });

  if (!deleted) {
    throw new AppError(
      'This movie is not in your watchlist.',
      404
    );
  }

  // Remove the movie ID from the user's watchlist field
  await User.findByIdAndUpdate(userId, {
    $pull: {
      watchlist: movieId,
    },
  });

  return deleted;
};

module.exports = {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
};