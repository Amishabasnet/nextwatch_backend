const { body } = require('express-validator');
const { GENRES, CONTENT_TYPES, RATINGS } = require('../config/constants');

const createMovieValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),

  body('description').optional().isString().withMessage('Description must be a string'),

  body('genres')
    .optional()
    .isArray()
    .withMessage('Genres must be an array')
    .custom((arr) => arr.every((g) => GENRES.includes(g)))
    .withMessage(`Genres must be valid: ${GENRES.join(', ')}`),

  body('contentType')
    .optional()
    .isIn(CONTENT_TYPES)
    .withMessage(`contentType must be one of: ${CONTENT_TYPES.join(', ')}`),

  body('rating')
    .optional()
    .isIn(RATINGS)
    .withMessage(`rating must be one of: ${RATINGS.join(', ')}`),

  body('releaseYear')
    .optional()
    .isInt({ min: 1888, max: new Date().getFullYear() + 5 })
    .withMessage('releaseYear must be a valid year'),

  body('averageScore')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('averageScore must be between 0 and 10'),
];

const updateMovieValidator = createMovieValidator.map((v) => v.optional());

module.exports = { createMovieValidator, updateMovieValidator };
