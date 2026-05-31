const express = require('express');
const { createRating, getUserRatings, updateRating } = require('../controllers/ratingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createRating);
router.get('/user', protect, getUserRatings);
router.put('/:id', protect, updateRating);

module.exports = router;
