const express = require('express');
const MoodController = require('../controllers/moodController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { moodValidator } = require('../validators/moodValidator');

const router = express.Router();

router.use(authenticate);

router.post('/', moodValidator, validate, MoodController.logMood);
router.get('/', MoodController.getMoodHistory);
router.get('/latest', MoodController.getLatestMood);
router.get('/recommendations', MoodController.getRecommendationsByMood);
router.delete('/:id', MoodController.deleteMood);

module.exports = router;
