const User = require('../models/User');
const Movie = require('../models/Movie');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/apiResponse');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  sendResponse(res, 200, { users }, 'Users retrieved');
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  sendResponse(res, 200, { user }, 'User retrieved');
});

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'avatar', 'preferences'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  sendResponse(res, 200, { user }, 'Profile updated');
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  sendResponse(res, 200, null, 'User deleted');
});

// @desc    Add movie to watchlist
// @route   POST /api/v1/users/watchlist/:movieId
// @access  Private
const addToWatchlist = asyncHandler(async (req, res, next) => {
  const movie = await Movie.findById(req.params.movieId);
  if (!movie) return next(new AppError('Movie not found', 404));

  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { watchlist: req.params.movieId },
  });

  sendResponse(res, 200, null, 'Movie added to watchlist');
});

// @desc    Remove movie from watchlist
// @route   DELETE /api/v1/users/watchlist/:movieId
// @access  Private
const removeFromWatchlist = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { watchlist: req.params.movieId },
  });

  sendResponse(res, 200, null, 'Movie removed from watchlist');
});

// @desc    Get user watchlist
// @route   GET /api/v1/users/watchlist
// @access  Private
const getWatchlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('watchlist');
  sendResponse(res, 200, { watchlist: user.watchlist }, 'Watchlist retrieved');
});

// @desc    Toggle movie favourite
// @route   POST /api/v1/users/favorites/:movieId
// @access  Private
const toggleFavorite = asyncHandler(async (req, res, next) => {
  const movie = await Movie.findById(req.params.movieId);
  if (!movie) return next(new AppError('Movie not found', 404));

  const user = await User.findById(req.user.id);
  const isFavorite = user.favorites.includes(req.params.movieId);

  const update = isFavorite
    ? { $pull: { favorites: req.params.movieId } }
    : { $addToSet: { favorites: req.params.movieId } };

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
