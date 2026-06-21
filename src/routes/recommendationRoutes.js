const express = require('express');
const RecommendationController = require('../controllers/recommendationController');
const RecommendationFeedbackController = require('../controllers/recommendationFeedbackController');
const { authenticate } = require('../middleware/authenticate');
const { authorizeSelf } = require('../middleware/authorizeSelf');
const { validate } = require('../middleware/validate');
const { submitFeedbackValidator } = require('../validators/recommendationValidator');

const router = express.Router();

router.post(
  '/feedback',
  authenticate,
  submitFeedbackValidator,
  validate,
  RecommendationFeedbackController.submitFeedback
);

router.get(
  '/:userId',
  authenticate,
  authorizeSelf('userId'),
  RecommendationController.getRecommendations
);

module.exports = router;
