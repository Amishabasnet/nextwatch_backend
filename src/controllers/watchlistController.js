const Watchlist = require('../models/Watchlist');
const Movie = require('../models/Movie');

// Add a movie to the logged-in user's watchlist
const addToWatchlist = async (req, res, next) => {
  try {
    const { movieId } = req.body;

    // Make sure a movie ID was included in the request
    if (!movieId) {
      return res.status(400).json({
        message: 'Please provide a movieId',
      });
    }

    // Check that the selected movie exists
    const movieExists = await Movie.findById(movieId);

    if (!movieExists) {
      return res.status(404).json({
        message: 'Movie not found',
      });
    }

    // Check whether the movie is already in the user's watchlist
    const duplicate = await Watchlist.findOne({
      user: req.user._id,
      movie: movieId,
    });

    if (duplicate) {
      return res.status(400).json({
        message: 'Movie is already in your watchlist',
      });
    }

    // Create a new watchlist entry for the user
    const watchlistItem = await Watchlist.create({
      user: req.user._id,
      movie: movieId,
    });

    res.status(201).json(watchlistItem);
  } catch (error) {
    next(error);
  }
};

// Get all movies saved in the user's watchlist
const getWatchlist = async (req, res, next) => {
  try {
    // Include the complete movie details and show recently added items first
    const watchlist = await Watchlist.find({
      user: req.user._id,
    })
      .populate('movie')
      .sort({
        createdAt: -1,
      });

    res.status(200).json(watchlist);
  } catch (error) {
    next(error);
  }
};

// Remove a movie from the logged-in user's watchlist
const removeFromWatchlist = async (req, res, next) => {
  try {
    const { movieId } = req.params;

    // Find the selected movie in the user's watchlist
    const watchlistItem = await Watchlist.findOne({
      user: req.user._id,
      movie: movieId,
    });

    // Return an error when the movie is not in the watchlist
    if (!watchlistItem) {
      return res.status(404).json({
        message: 'Movie not found in your watchlist',
      });
    }

    // Delete the movie from the watchlist
    await watchlistItem.deleteOne();

    res.status(200).json({
      message: 'Movie removed from watchlist',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
};