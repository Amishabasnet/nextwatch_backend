const express = require('express');
const { body, param } = require('express-validator');

const {
  createMoodEntry,
  getUserMoods,
  getLatestMood,
} = require('../controllers/moodController');

const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { VALID_MOODS } = require('../models/Mood');

const router = express.Router();

// Check that the user ID in the URL is a valid MongoDB ID
const userIdParam = param('userId')
  .isMongoId()
  .withMessage('userId must be a valid MongoDB ObjectId');

// Validation rules used when saving a new mood
const createRules = [
  // Make sure the submitted mood is available in the supported mood list
  body('mood')
    .notEmpty()
    .withMessage('mood is required')
    .isIn(VALID_MOODS)
    .withMessage(`mood must be one of: ${VALID_MOODS.join(', ')}`),

  // Check the selected date when one is included in the request
  body('selectedAt')
    .optional()
    .isISO8601()
    .withMessage('selectedAt must be a valid ISO 8601 date string'),
];

// Save a new mood for the currently logged-in user
// The user ID comes from the login token, and each request creates a new entry
router.post(
  '/',
  protect,
  createRules,
  validate,
  createMoodEntry
);

// Get a user's complete mood history
// The newest mood entries are shown first
router.get(
  '/:userId',
  protect,
  [userIdParam],
  validate,
  getUserMoods
);

// Get the most recently selected mood of a user
// This mood can be used to provide personalised movie recommendations
router.get(
  '/:userId/latest',
  protect,
  [userIdParam],
  validate,
  getLatestMood
);

module.exports = router;