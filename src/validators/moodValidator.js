const { body } = require('express-validator');
const { MOODS } = require('../config/constants');

const moodValidator = [
  body('mood')
    .notEmpty()
    .withMessage('Mood is required')
    .isIn(MOODS)
    .withMessage(`Mood must be one of: ${MOODS.join(', ')}`),

  body('note')
    .optional()
    .isString()
    .withMessage('Note must be a string')
    .isLength({ max: 300 })
    .withMessage('Note must not exceed 300 characters'),
];

module.exports = { moodValidator };
