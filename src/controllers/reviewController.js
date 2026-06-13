const Review = require('../models/Review');
const Movie = require('../models/Movie');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendResponse } = require('../utils/apiResponse');

// Get all reviews submitted for a specific movie
const getReviews = asyncHandler(async (req, res) => {
  // Include the reviewer's name and profile image
  const reviews = await Review.find({
    movie: req.params.movieId,
  }).populate('user', 'name avatar');

  sendResponse(res, 200, { reviews }, 'Reviews retrieved');
});

// Add a new review for a movie
const createReview = asyncHandler(async (req, res, next) => {
  // Make sure the selected movie exists
  const movie = await Movie.findById(req.params.movieId);

  if (!movie) {
    return next(new AppError('Movie not found', 404));
  }

  // Save the review under the currently logged-in user
  const review = await Review.create({
    movie: req.params.movieId,
    user: req.user.id,
    rating: req.body.rating,
    content: req.body.content,
    spoiler: req.body.spoiler || false,
  });

  sendResponse(res, 201, { review }, 'Review created');
});

// Update an existing review
const updateReview = asyncHandler(async (req, res, next) => {
  let review = await Review.findById(req.params.id);

  // Return an error when the review does not exist
  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  // Only the review owner or an admin can update the review
  if (
    review.user.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new AppError('Not authorised to update this review', 403)
    );
  }

  // Update the rating and written review
  review = await Review.findByIdAndUpdate(
    req.params.id,
    {
      rating: req.body.rating,
      content: req.body.content,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  sendResponse(res, 200, { review }, 'Review updated');
});

// Delete an existing review
const deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  // Return an error when the review cannot be found
  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  // Only the review owner or an admin can delete the review
  if (
    review.user.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new AppError('Not authorised to delete this review', 403)
    );
  }

  // Remove the review from the database
  await review.remove();

  sendResponse(res, 200, null, 'Review deleted');
});

module.exports = { getReviews, createReview, updateReview, deleteReview };