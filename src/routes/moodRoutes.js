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

// Shared validation helpers 

const userIdParam = param('userId')
  .isMongoId()
  .withMessage('userId must be a valid MongoDB ObjectId');

// POST validation rules 

const createRules = [
  body('mood')
    .notEmpty()
    .withMessage('mood is required')
    .isIn(VALID_MOODS)
    .withMessage(`mood must be one of: ${VALID_MOODS.join(', ')}`),

  body('selectedAt')
    .optional()
    .isISO8601()
    .withMessage('selectedAt must be a valid ISO 8601 date string'),
];

// Routes (all JWT-protected) 

/**
 * POST /api/moods
 * Save a mood selection for the authenticated user.
 *
 * Body:
 * {
 *   "mood": "Happy",           // required — one of VALID_MOODS
 *   "selectedAt": "2025-01-01T10:00:00.000Z"  // optional, defaults to now
 * }
 *
 * Notes:
 * - userId is taken from the JWT (req.user._id), not the request body.
 * - Multiple entries are allowed; each POST creates a new time-stamped record.
 */
router.post('/', protect, createRules, validate, createMoodEntry);

/**
 * GET /api/moods/:userId
 * Retrieve the full mood history for a user, newest first.
 * Own record only (admins can fetch any).
 *
 * Response includes `count` and a `moods` array sorted by selectedAt desc.
 */
router.get('/:userId', protect, [userIdParam], validate, getUserMoods);

/**
 * GET /api/moods/:userId/latest
 * Retrieve the single most-recent mood entry for a user.
 * This endpoint is consumed by the recommendation engine to personalise results.
 * Own record only (admins can fetch any).
 */
router.get('/:userId/latest', protect, [userIdParam], validate, getLatestMood);

module.exports = router;
