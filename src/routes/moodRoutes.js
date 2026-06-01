const express = require('express');
const { logMood, getMoodHistory, getLatestMood } = require('../controllers/moodController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, logMood);
router.get('/history', protect, getMoodHistory);
router.get('/latest', protect, getLatestMood);

module.exports = router;
