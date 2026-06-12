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

// Reusable validators 

// Validate a single consent category item (optional field, must be boolean if present)
const consentItemRule = (fieldPath) =>
  body(fieldPath)
    .optional()
    .isBoolean()
    .withMessage(`${fieldPath} must be a boolean (true or false)`);

// All five category validators — used in both POST and PUT
const consentItemRules = [
  consentItemRule('moodSelection'),
  consentItemRule('genrePreferences'),
  consentItemRule('viewingHistory'),
  consentItemRule('ratings'),
  consentItemRule('feedback'),
  // Also accept the nested consentItems.* shape
  consentItemRule('consentItems.moodSelection'),
  consentItemRule('consentItems.genrePreferences'),
  consentItemRule('consentItems.viewingHistory'),
  consentItemRule('consentItems.ratings'),
  consentItemRule('consentItems.feedback'),
  body('dataUsageDescription')
    .optional()
    .isString()
    .withMessage('dataUsageDescription must be a string')
    .isLength({ max: 1000 })
    .withMessage('dataUsageDescription cannot exceed 1000 characters'),
];

const userIdParamRule = [
  param('userId')
    .isMongoId()
    .withMessage('userId must be a valid MongoDB ObjectId'),
];

// Routes (all protected by JWT) 

/**
 * POST /api/consent
 * Create a new consent record for the authenticated user.
 *
 * Body (flat form accepted):
 * {
 *   "moodSelection": true,
 *   "genrePreferences": true,
 *   "viewingHistory": false,
 *   "ratings": true,
 *   "feedback": false,
 *   "dataUsageDescription": "Optional custom text"
 * }
 *
 * Or nested:
 * {
 *   "consentItems": {
 *     "moodSelection": true,
 *     ...
 *   }
 * }
 */
router.post('/', protect, consentItemRules, validate, createConsentRecord);

/**
 * GET /api/consent/:userId
 * Retrieve a user's consent record.
 * Users can only fetch their own; admins can fetch any.
 */
router.get('/:userId', protect, userIdParamRule, validate, getConsentRecord);

/**
 * PUT /api/consent/:userId
 * Partially update a consent record — only supplied fields are changed.
 * Users can only update their own; admins can update any.
 */
router.put(
  '/:userId',
  protect,
  [...userIdParamRule, ...consentItemRules],
  validate,
  updateConsentRecord
);

module.exports = router;
