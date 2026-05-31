const mongoose = require('mongoose');
const Rating = require('../models/Rating');
const Movie = require('../models/Movie');

// Helper function to update the average rating on a Movie
const updateMovieAvgRating = async (movieId) => {
  try {
    const stats = await Rating.aggregate([
      { $match: { movie: new mongoose.Types.ObjectId(movieId) } },
      {
        $group: {
          _id: '$movie',
          avgRating: { $avg: '$rating' },
        },
      },
    ]);

    if (stats.length > 0) {
      // Round to 1 decimal place
      const roundedAvg = Math.round(stats[0].avgRating * 10) / 10;
      await Movie.findByIdAndUpdate(movieId, { rating: roundedAvg });
    } else {
      await Movie.findByIdAndUpdate(movieId, { rating: 0 });
    }
  } catch (error) {
    console.error(`Failed to update movie average rating: ${error.message}`);
  }
};

/**
 * @desc    Create a new movie rating
 * @route   POST /api/ratings
 * @access  Private
 */
const createRating = async (req, res, next) => {
  try {
    const { movieId, rating } = req.body;

    // Validation
    if (!movieId || rating === undefined) {
      return res.status(400).json({ message: 'Please provide both movieId and rating' });
    }

    const ratingVal = Number(rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 10) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 10' });
    }

    // Check if movie exists
    const movieExists = await Movie.findById(movieId);
    if (!movieExists) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Check if rating already exists for this user/movie combo
    const existingRating = await Rating.findOne({ user: req.user._id, movie: movieId });
    if (existingRating) {
      return res.status(400).json({
        message: 'You have already rated this movie. Use PUT /api/ratings/:id to update.',
      });
    }

    const ratingDoc = await Rating.create({
      user: req.user._id,
      movie: movieId,
      rating: ratingVal,
    });

    // Update Movie average rating
    await updateMovieAvgRating(movieId);

    res.status(201).json(ratingDoc);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user's movie ratings
 * @route   GET /api/ratings/user
 * @access  Private
 */
const getUserRatings = async (req, res, next) => {
  try {
    const ratings = await Rating.find({ user: req.user._id })
      .populate('movie')
      .sort({ createdAt: -1 });

    res.status(200).json(ratings);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a movie rating by rating document ID
 * @route   PUT /api/ratings/:id
 * @access  Private
 */
const updateRating = async (req, res, next) => {
  try {
    const ratingDoc = await Rating.findById(req.params.id);
    if (!ratingDoc) {
      return res.status(404).json({ message: 'Rating record not found' });
    }

    // Ownership check
    if (ratingDoc.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this rating' });
    }

    const { rating } = req.body;
    if (rating === undefined) {
      return res.status(400).json({ message: 'Please provide a rating' });
    }

    const ratingVal = Number(rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 10) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 10' });
    }

    ratingDoc.rating = ratingVal;
    await ratingDoc.save();

    // Re-calculate Movie average rating
    await updateMovieAvgRating(ratingDoc.movie);

    res.status(200).json(ratingDoc);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRating,
  getUserRatings,
  updateRating,
};
