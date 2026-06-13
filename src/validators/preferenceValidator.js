const { body } = require('express-validator');
const { GENRES, CONTENT_TYPES, RATINGS } = require('../config/constants');

const preferenceValidator = [
  body('favoriteGenres')
    .optional()
    .isArray()
    .withMessage('favoriteGenres must be an array')
    .custom((arr) => arr.every((g) => GENRES.includes(g)))
    .withMessage(`favoriteGenres must be valid genres: ${GENRES.join(', ')}`),

  body('preferredContentTypes')
    .optional()
    .isArray()
    .withMessage('preferredContentTypes must be an array')
    .custom((arr) => arr.every((t) => CONTENT_TYPES.includes(t)))
    .withMessage(`preferredContentTypes must be one of: ${CONTENT_TYPES.join(', ')}`),

  body('preferredRatings')
    .optional()
    .isArray()
    .withMessage('preferredRatings must be an array')
    .custom((arr) => arr.every((r) => RATINGS.includes(r)))
    .withMessage(`preferredRatings must be one of: ${RATINGS.join(', ')}`),

  body('preferredLanguages')
    .optional()
    .isArray()
    .withMessage('preferredLanguages must be an array'),

  body('minReleaseYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('minReleaseYear must be a valid year'),

  body('maxReleaseYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 5 })
    .withMessage('maxReleaseYear must be a valid year'),

  body('excludedGenres')
    .optional()
    .isArray()
    .withMessage('excludedGenres must be an array')
    .custom((arr) => arr.every((g) => GENRES.includes(g)))
    .withMessage(`excludedGenres must be valid genres`),
];

module.exports = { preferenceValidator };
