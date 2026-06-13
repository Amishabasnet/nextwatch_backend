const User = require('../models/User');
const Movie = require('../models/Movie');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/apiResponse');

// Get the list of all registered users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();

  sendResponse(res, 200, { users }, 'Users retrieved');
});

// Get the details of a user using their ID
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  // Return an error when the user cannot be found
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  sendResponse(res, 200, { user }, 'User retrieved');
});

// Update the profile of the currently logged-in user
const updateProfile = asyncHandler(async (req, res) => {
  // These are the only profile fields that users are allowed to update
  const allowedFields = ['name', 'avatar', 'preferences'];
  const updates = {};

  // Add only the fields included in the request
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Save the changes and return the updated user details
  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  sendResponse(res, 200, { user }, 'Profile updated');
});

// Remove a user account from the system
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  // Return an error when the user does not exist
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  sendResponse(res, 200, null, 'User deleted');
});

// Add a movie to the logged-in user's watchlist
const addToWatchlist = asyncHandler(async (req, res, next) => {
  const movie = await Movie.findById(req.params.movieId);

  // Make sure the selected movie exists
  if (!movie) {
    return next(new AppError('Movie not found', 404));
  }

  // Add the movie only when it is not already in the watchlist
  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: {
      watchlist: req.params.movieId,
    },
  });

  sendResponse(res, 200, null, 'Movie added to watchlist');
});

// Remove a movie from the logged-in user's watchlist
const removeFromWatchlist = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    $pull: {
      watchlist: req.params.movieId,
    },
  });

  sendResponse(res, 200, null, 'Movie removed from watchlist');
});

// Get all movies saved in the user's watchlist
const getWatchlist = asyncHandler(async (req, res) => {
  // Replace movie IDs with their complete movie details
  const user = await User.findById(req.user.id).populate('watchlist');

  sendResponse(
    res,
    200,
    { watchlist: user.watchlist },
    'Watchlist retrieved'
  );
});

// Add or remove a movie from the user's favourites
const toggleFavorite = asyncHandler(async (req, res, next) => {
  const movie = await Movie.findById(req.params.movieId);

  // Make sure the selected movie exists
  if (!movie) {
    return next(new AppError('Movie not found', 404));
  }

  const user = await User.findById(req.user.id);

  // Check whether the movie is already in the favourites list
  const isFavorite = user.favorites.includes(req.params.movieId);

  // Remove the movie when it is already saved, otherwise add it
  const update = isFavorite
    ? {
        $pull: {
          favorites: req.params.movieId,
        },
      }
    : {
        $addToSet: {
          favorites: req.params.movieId,
        },
      };

  await User.findByIdAndUpdate(req.user.id, update);

  sendResponse(
    res,
    200,
    null,
    isFavorite ? 'Removed from favorites' : 'Added to favorites'
  );
});

module.exports = {
  getUsers,
  getUser,
  updateProfile,
  deleteUser,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  toggleFavorite,
};