const { body, param } = require('express-validator');
const deleteAccountValidator = [
  param('userId')
    .isMongoId()
    .withMessage('userId must be a valid MongoDB ObjectId'),

  body('password')
    .notEmpty()
    .withMessage('Current password is required to confirm account deletion'),
];

const clearHistoryValidator = [
  param('userId')
    .isMongoId()
    .withMessage('userId must be a valid MongoDB ObjectId'),
];

const updateConsentValidator = [
  param('userId')
    .isMongoId()
    .withMessage('userId must be a valid MongoDB ObjectId'),

  body('consentGiven')
    .exists({ checkNull: true })
    .withMessage('consentGiven is required')
    .isBoolean()
    .withMessage('consentGiven must be a boolean'),

  body('withdrawalReason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('withdrawalReason must not exceed 500 characters'),
];

module.exports = {
  deleteAccountValidator,
  clearHistoryValidator,
  updateConsentValidator,
};
