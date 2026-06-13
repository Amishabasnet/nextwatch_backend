const express = require('express');
const { body, param, query } = require('express-validator');

const {
  addToWatchlist,
  getUserWatchlist,
  removeFromWatchlist,
} = require('../controllers/watchlistController');

const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Require users to be logged in before using any watchlist route
router.use(protect);

// Check the movie ID submitted in the request body
const movieIdBody = body('movieId')
  .notEmpty()
  .withMessage('movieId is required')
  .isMongoId()
  .withMessage('movieId must be a valid MongoDB ObjectId');

// Check the movie ID included in the URL
const movieIdParam = param('movieId')
  .isMongoId()
  .withMessage('movieId must be a valid MongoDB ObjectId');

// Check the user ID included in the URL
const userIdParam = param('userId')
  .isMongoId()
  .withMessage('userId must be a valid MongoDB ObjectId');

// Validate the optional pagination values
const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

// Keep the fixed routes above the dynamic user ID route.
// Otherwise, Express may treat words such as "add" as a user ID.

// Add a movie to the logged-in user's watchlist
router.post(
  '/add',
  [movieIdBody],
  validate,
  addToWatchlist
);

// Remove a movie from the logged-in user's watchlist
// The user ID comes from the login token, so users can only edit their own list
router.delete(
  '/remove/:movieId',
  [movieIdParam],
  validate,
  removeFromWatchlist
);

// Get a user's watchlist with pagination
// Regular users can view their own list, while admins can view any user's list
router.get(
  '/:userId',
  [userIdParam, ...paginationRules],
  validate,
  getUserWatchlist
);

module.exports = router;