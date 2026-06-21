const express = require('express');
const PrivacyController = require('../controllers/privacyController');
const { authenticate } = require('../middleware/authenticate');
const { authorizeSelf } = require('../middleware/authorizeSelf');
const { validate } = require('../middleware/validate');
const {
  deleteAccountValidator,
  clearHistoryValidator,
  updateConsentValidator,
} = require('../validators/privacyValidator');

const router = express.Router();

router.delete(
  '/users/:userId',
  authenticate,
  authorizeSelf('userId'),
  deleteAccountValidator,
  validate,
  PrivacyController.deleteAccount
);

router.delete(
  '/privacy/history/:userId',
  authenticate,
  authorizeSelf('userId'),
  clearHistoryValidator,
  validate,
  PrivacyController.clearHistory
);

router.put(
  '/consent/:userId',
  authenticate,
  authorizeSelf('userId'),
  updateConsentValidator,
  validate,
  PrivacyController.updateConsent
);

module.exports = router;
