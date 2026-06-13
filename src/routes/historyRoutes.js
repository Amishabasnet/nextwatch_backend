const express = require('express');
const { body, param, query } = require('express-validator');

const {
  recordEvent,
  getUserHistory,
  clearUserHistory,
} = require('../controllers/historyController');

const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ACTION_TYPES } = require('../models/History');

const router = express.Router();

// Require a valid login token for every history route
router.use(protect);

// Check that the user ID in the URL is a valid MongoDB ID
const userIdParam = param('userId')
  .isMongoId()
  .withMessage('userId must be a valid MongoDB ObjectId');

// Check that the requested action type is supported
const actionTypeQuery = query('actionType')
  .optional()
  .isIn(ACTION_TYPES)
  .withMessage(`actionType must be one of: ${ACTION_TYPES.join(', ')}`);

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

// Validation rules used when recording a new interaction
const recordRules = [
  body('movieId')
    .notEmpty()
    .withMessage('movieId is required')
    .isMongoId()
    .withMessage('movieId must be a valid MongoDB ObjectId'),

  body('actionType')
    .notEmpty()
    .withMessage('actionType is required')
    .isIn(ACTION_TYPES)
    .withMessage(`actionType must be one of: ${ACTION_TYPES.join(', ')}`),

  // Check the event time when it is provided
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('timestamp must be a valid ISO 8601 date string'),

  // Additional event information must be submitted as an object
  body('metadata')
    .optional()
    .isObject()
    .withMessage('metadata must be a plain object'),

  // Check the viewing percentage for watched events
  body('metadata.watchPercentage')
    .if(body('actionType').equals('watched'))
    .if(body('metadata').exists())
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage(
      'metadata.watchPercentage must be a number between 0 and 100'
    ),

  // Check the number of minutes watched
  body('metadata.durationWatched')
    .if(body('actionType').equals('watched'))
    .if(body('metadata').exists())
    .optional()
    .isInt({ min: 0 })
    .withMessage(
      'metadata.durationWatched must be a non-negative integer (minutes)'
    ),

  // Check the rating value for rated events
  body('metadata.ratingValue')
    .if(body('actionType').equals('rated'))
    .if(body('metadata').exists())
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage(
      'metadata.ratingValue must be a number between 1 and 10'
    ),

  // Check the movie's position when it was clicked from a list
  body('metadata.position')
    .if(body('actionType').equals('clicked'))
    .if(body('metadata').exists())
    .optional()
    .isInt({ min: 0 })
    .withMessage(
      'metadata.position must be a non-negative integer (0-based list index)'
    ),

  // Check where the interaction came from
  body('metadata.source')
    .optional()
    .isIn([
      'recommendations',
      'search',
      'browse',
      'watchlist',
      'trending',
    ])
    .withMessage(
      'metadata.source must be one of: recommendations, search, browse, watchlist, trending'
    ),
];

// Validation rules used when retrieving history
const getHistoryRules = [
  userIdParam,
  actionTypeQuery,

  // Allow results to be filtered by a particular movie
  query('movieId')
    .optional()
    .isMongoId()
    .withMessage('movieId filter must be a valid MongoDB ObjectId'),

  // Check the beginning of the requested date range
  query('from')
    .optional()
    .isISO8601()
    .withMessage('from must be a valid ISO 8601 date string'),

  // Check the end of the requested date range
  query('to')
    .optional()
    .isISO8601()
    .withMessage('to must be a valid ISO 8601 date string')
    .custom((value, { req }) => {
      const from = req.query.from;

      // The ending date cannot be earlier than the starting date
      if (from && new Date(value) < new Date(from)) {
        throw new Error('to must be equal to or later than from');
      }

      return true;
    }),

  ...paginationRules,
];

// Validation rules used when deleting history
const deleteHistoryRules = [
  userIdParam,
  actionTypeQuery,
];

// Record a new movie interaction for the logged-in user
// Repeated actions are allowed because they help improve recommendations
router.post(
  '/',
  recordRules,
  validate,
  recordEvent
);

// Get a user's interaction history with optional filters and pagination
// Regular users can view their own history, while admins can view any history
router.get(
  '/:userId',
  getHistoryRules,
  validate,
  getUserHistory
);

// Delete all history or only events of a selected action type
// Regular users can clear their own history, while admins can clear any history
router.delete(
  '/:userId',
  deleteHistoryRules,
  validate,
  clearUserHistory
);

module.exports = router;