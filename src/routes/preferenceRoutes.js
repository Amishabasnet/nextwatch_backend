const express = require('express');
const { body, param } = require('express-validator');

const {
  createPreferenceRecord,
  getPreferenceRecord,
  updatePreferenceRecord,
} = require('../controllers/preferenceController');

const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const {
  SUPPORTED_GENRES,
  SUPPORTED_LANGUAGES,
} = require('../models/Preference');

const router = express.Router();

// Check that the user ID provided in the URL is a valid MongoDB ID
const userIdParam = param('userId')
  .isMongoId()
  .withMessage('userId must be a valid MongoDB ObjectId');

// Validate genre fields used in different preference requests
const genreArrayRule = (field) =>
  body(field)
    .optional()
    .isArray()
    .withMessage(`${field} must be an array`)
    .custom((genres) => {
      // Make sure every genre is supported by NextWatch
      if (!genres.every((genre) => SUPPORTED_GENRES.includes(genre))) {
        throw new Error(
          `${field} contains unsupported values. Allowed: ${SUPPORTED_GENRES.join(', ')}`
        );
      }

      // Do not allow the same genre to appear more than once
      if (new Set(genres).size !== genres.length) {
        throw new Error(`${field} must not contain duplicates`);
      }

      return true;
    });

// Check that the selected language is supported
const languageRule = body('preferredLanguage')
  .optional()
  .isString()
  .isIn(SUPPORTED_LANGUAGES)
  .withMessage(
    `preferredLanguage must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`
  );

// Rules used when creating a new preference record
const createRules = [
  genreArrayRule('favoriteGenres'),
  genreArrayRule('dislikedGenres'),
  languageRule,
];

// Rules used when updating an existing preference record
const updateRules = [
  userIdParam,
  genreArrayRule('favoriteGenres'),
  genreArrayRule('dislikedGenres'),
  languageRule,

  // Check whether the user wants to add or remove individual genres
  body('patchMode')
    .optional()
    .isBoolean()
    .withMessage('patchMode must be a boolean'),

  // Validate the genre lists used in patch mode
  genreArrayRule('addFavorites'),
  genreArrayRule('removeFavorites'),
  genreArrayRule('addDisliked'),
  genreArrayRule('removeDisliked'),
];

// Create preferences for the currently logged-in user
router.post(
  '/',
  protect,
  createRules,
  validate,
  createPreferenceRecord
);

// Get the preferences of a specific user
// Regular users can access their own record, while admins can access any record
router.get(
  '/:userId',
  protect,
  [userIdParam],
  validate,
  getPreferenceRecord
);

// Update a user's saved preferences
// The request can replace complete lists or add and remove individual genres
router.put(
  '/:userId',
  protect,
  updateRules,
  validate,
  updatePreferenceRecord
);

module.exports = router;