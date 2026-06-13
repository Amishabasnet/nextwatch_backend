const express = require('express');
const { body, param } = require('express-validator');

const {
  createConsentRecord,
  getConsentRecord,
  updateConsentRecord,
} = require('../controllers/consentController');

const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Check that a consent option contains either true or false
const consentItemRule = (fieldPath) =>
  body(fieldPath)
    .optional()
    .isBoolean()
    .withMessage(`${fieldPath} must be a boolean (true or false)`);

// Validation rules for all consent options
const consentItemRules = [
  consentItemRule('moodSelection'),
  consentItemRule('genrePreferences'),
  consentItemRule('viewingHistory'),
  consentItemRule('ratings'),
  consentItemRule('feedback'),

  // Allow consent options to be submitted inside the consentItems object
  consentItemRule('consentItems.moodSelection'),
  consentItemRule('consentItems.genrePreferences'),
  consentItemRule('consentItems.viewingHistory'),
  consentItemRule('consentItems.ratings'),
  consentItemRule('consentItems.feedback'),

  // Check the optional explanation provided for data usage
  body('dataUsageDescription')
    .optional()
    .isString()
    .withMessage('dataUsageDescription must be a string')
    .isLength({ max: 1000 })
    .withMessage('dataUsageDescription cannot exceed 1000 characters'),
];

// Check that the user ID in the URL is a valid MongoDB ID
const userIdParamRule = [
  param('userId')
    .isMongoId()
    .withMessage('userId must be a valid MongoDB ObjectId'),
];

// Create a consent record for the currently logged-in user
router.post(
  '/',
  protect,
  consentItemRules,
  validate,
  createConsentRecord
);

// Get the consent record of a specific user
// Regular users can access their own record, while admins can access any record
router.get(
  '/:userId',
  protect,
  userIdParamRule,
  validate,
  getConsentRecord
);

// Update the consent record of a specific user
// Only the consent fields included in the request will be changed
router.put(
  '/:userId',
  protect,
  [...userIdParamRule, ...consentItemRules],
  validate,
  updateConsentRecord
);

module.exports = router;