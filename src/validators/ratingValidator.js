const { body } = require('express-validator');

const createRatingValidator = [
  body('movieId')
    .notEmpty()
    .withMessage('movieId is required')
    .isMongoId()
    .withMessage('movieId must be a valid ID'),

  body('rating')
    .notEmpty()
    .withMessage('rating is required')
    .isFloat({ min: 1, max: 10 })
    .withMessage('rating must be a number between 1 and 10'),

  body('liked')
    .optional()
    .isBoolean()
    .withMessage('liked must be true or false'),

  body('disliked')
    .optional()
    .isBoolean()
    .withMessage('disliked must be true or false'),

  body('feedbackText')
    .optional()
    .isString()
    .withMessage('feedbackText must be a string')
    .isLength({ max: 1000 })
    .withMessage('feedbackText must not exceed 1000 characters'),

  // Cross-field: liked and disliked cannot both be true
  body('liked').custom((liked, { req }) => {
    if (liked && req.body.disliked) {
      throw new Error('A rating cannot be both liked and disliked');
    }
    return true;
  }),
];

const updateRatingValidator = [
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 10 })
    .withMessage('rating must be a number between 1 and 10'),

  body('liked')
    .optional()
    .isBoolean()
    .withMessage('liked must be true or false'),

  body('disliked')
    .optional()
    .isBoolean()
    .withMessage('disliked must be true or false'),

  body('feedbackText')
    .optional()
    .isString()
    .withMessage('feedbackText must be a string')
    .isLength({ max: 1000 })
    .withMessage('feedbackText must not exceed 1000 characters'),

  body('liked').custom((liked, { req }) => {
    if (liked && req.body.disliked) {
      throw new Error('A rating cannot be both liked and disliked');
    }
    return true;
  }),
];

module.exports = { createRatingValidator, updateRatingValidator };
