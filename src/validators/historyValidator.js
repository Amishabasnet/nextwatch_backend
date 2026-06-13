const { body } = require('express-validator');

const addHistoryValidator = [
  body('movieId')
    .notEmpty()
    .withMessage('movieId is required')
    .isMongoId()
    .withMessage('movieId must be a valid ID'),

  body('rating')
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage('rating must be between 1 and 10'),

  body('review')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('review must not exceed 1000 characters'),

  body('completed')
    .optional()
    .isBoolean()
    .withMessage('completed must be a boolean'),

  body('watchedAt')
    .optional()
    .isISO8601()
    .withMessage('watchedAt must be a valid date'),
];

const updateHistoryValidator = [
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage('rating must be between 1 and 10'),

  body('review')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('review must not exceed 1000 characters'),

  body('completed')
    .optional()
    .isBoolean()
    .withMessage('completed must be a boolean'),
];

module.exports = { addHistoryValidator, updateHistoryValidator };
