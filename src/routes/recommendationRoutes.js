const express = require('express');
const RecommendationController = require('../controllers/recommendationController');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
router.get('/:userId', authenticate, RecommendationController.getRecommendations);

module.exports = router;
