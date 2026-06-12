const express = require('express');
const { body, param } = require('express-validator');
const {
  createPreferenceRecord,
  getPreferenceRecord,
  updatePreferenceRecord,
} = require('../controllers/preferenceController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { SUPPORTED_GENRES, SUPPORTED_LANGUAGES } = require('../models/Preference');

const router = express.Router();

// Shared validation helpers

const userIdParam = param('userId')
  .isMongoId()
  .withMessage('userId must be a valid MongoDB ObjectId');

/**
 * Validates that a value is an array containing only supported genres,
 * with no duplicates. Used for favoriteGenres and dislikedGenres.
 */
const genreArrayRule = (field) =>
  body(field)
    .optional()
    .isArray()
    .withMessage(`${field} must be an array`)
    .custom((genres) => {
      if (!genres.every((g) => SUPPORTED_GENRES.includes(g))) {
        throw new Error(
          `${field} contains unsupported values. Allowed: ${SUPPORTED_GENRES.join(', ')}`
        );
      }
      if (new Set(genres).size !== genres.length) {
        throw new Error(`${field} must not contain duplicates`);
      }
      return true;
    });

const languageRule = body('preferredLanguage')
  .optional()
  .isString()
  .isIn(SUPPORTED_LANGUAGES)
  .withMessage(
    `preferredLanguage must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`
  );

// POST validation 

const createRules = [
  genreArrayRule('favoriteGenres'),
  genreArrayRule('dislikedGenres'),
  languageRule,
];

// PUT validation 
// Accepts either full-replace arrays or patchMode additive fields.

const updateRules = [
  userIdParam,
  genreArrayRule('favoriteGenres'),
  genreArrayRule('dislikedGenres'),
  languageRule,
  // patchMode additive fields
  body('patchMode')
    .optional()
    .isBoolean()
    .withMessage('patchMode must be a boolean'),
  genreArrayRule('addFavorites'),
  genreArrayRule('removeFavorites'),
  genreArrayRule('addDisliked'),
  genreArrayRule('removeDisliked'),
];

// Routes (all JWT-protected) 

/**
 * POST /api/preferences
 * Create the authenticated user's genre preference record.
 *
 * Body:
 * {
 *   "favoriteGenres": ["Action", "Drama", "Sci-Fi"],
 *   "dislikedGenres": ["Horror"],
 *   "preferredLanguage": "en"
 * }
 */
router.post('/', protect, createRules, validate, createPreferenceRecord);

/**
 * GET /api/preferences/:userId
 * Retrieve a user's genre preferences.
 * Own record only (admins can fetch any).
 */
router.get('/:userId', protect, [userIdParam], validate, getPreferenceRecord);

/**
 * PUT /api/preferences/:userId
 * Update genre preferences — partial update, only sent fields change.
 *
 * Full-replace example:
 * { "favoriteGenres": ["Comedy", "Romance"] }
 *
 * Patch-mode example (add/remove individual genres):
 * { "patchMode": true, "addFavorites": ["Horror"], "removeFavorites": ["Action"] }
 */
router.put('/:userId', protect, updateRules, validate, updatePreferenceRecord);

module.exports = router;
