const { body } = require('express-validator');

const addWatchlistValidator = [
  body('movieId')
    .notEmpty()
    .withMessage('movieId is required')
    .isMongoId()
    .withMessage('movieId must be a valid ID'),

  body('notes')
    .optional()
    .isString()
    .withMessage('notes must be a string')
    .isLength({ max: 300 })
    .withMessage('notes must not exceed 300 characters'),

  body('priority')
    .optional()
    .isInt()
    .withMessage('priority must be an integer'),
];

module.exports = { addWatchlistValidator };
