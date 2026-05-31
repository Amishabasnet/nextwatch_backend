const Watchlist = require('../models/Watchlist');
const Movie = require('../models/Movie');

/**
 * @desc    Add a movie to personal watchlist
 * @route   POST /api/watchlist
 * @access  Private
 */
const addToWatchlist = async (req, res, next) => {
  try {
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ message: 'Please provide a movieId' });
    }

    // Verify movie exists
    const movieExists = await Movie.findById(movieId);
    if (!movieExists) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Check if duplicate watchlist item
    const duplicate = await Watchlist.findOne({ user: req.user._id, movie: movieId });
    if (duplicate) {
      return res.status(400).json({ message: 'Movie is already in your watchlist' });
    }

    const watchlistItem = await Watchlist.create({
      user: req.user._id,
      movie: movieId,
    });

    res.status(201).json(watchlistItem);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's personal watchlist
 * @route   GET /api/watchlist
 * @access  Private
 */
const getWatchlist = async (req, res, next) => {
  try {
    const watchlist = await Watchlist.find({ user: req.user._id })
      .populate('movie')
      .sort({ createdAt: -1 });

    res.status(200).json(watchlist);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove a movie from personal watchlist
 * @route   DELETE /api/watchlist/:movieId
 * @access  Private
 */
const removeFromWatchlist = async (req, res, next) => {
  try {
    const { movieId } = req.params;

    const watchlistItem = await Watchlist.findOne({ user: req.user._id, movie: movieId });
    if (!watchlistItem) {
      return res.status(404).json({ message: 'Movie not found in your watchlist' });
    }

    await watchlistItem.deleteOne();
    res.status(200).json({ message: 'Movie removed from watchlist' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
};
