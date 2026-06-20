const { body } = require('express-validator');
const submitFeedbackValidator = [
  body('movieId')
    .notEmpty()
    .withMessage('movieId is required')
    .isMongoId()
    .withMessage('movieId must be a valid ID'),

  body('clicked')
    .optional()
    .isBoolean()
    .withMessage('clicked must be true or false'),

  body('liked')
    .optional()
    .isBoolean()
    .withMessage('liked must be true or false'),

  body('disliked')
    .optional()
    .isBoolean()
    .withMessage('disliked must be true or false'),

  body('markedIrrelevant')
    .optional()
    .isBoolean()
    .withMessage('markedIrrelevant must be true or false'),

  body('irrelevantReason')
    .optional()
    .isString()
    .withMessage('irrelevantReason must be a string')
    .isLength({ max: 500 })
    .withMessage('irrelevantReason must not exceed 500 characters'),

  body('liked').custom((liked, { req }) => {
    if (liked && req.body.disliked) {
      throw new Error('A recommendation cannot be both liked and disliked');
    }
    return true;
  }),

  body('movieId').custom((_, { req }) => {
    const { clicked, liked, disliked, markedIrrelevant, irrelevantReason } = req.body;
    const hasSignal = [clicked, liked, disliked, markedIrrelevant, irrelevantReason].some(
      (value) => value !== undefined
    );
    if (!hasSignal) {
      throw new Error(
        'At least one of clicked, liked, disliked, markedIrrelevant, or irrelevantReason is required'
      );
    }
    return true;
  }),
];

module.exports = { submitFeedbackValidator };
