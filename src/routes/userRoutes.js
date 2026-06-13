const express = require('express');
const {
  getUsers,
  getUser,
  updateProfile,
  deleteUser,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  toggleFavorite,
} = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// User profile routes
router.put('/profile', updateProfile);
router.get('/watchlist', getWatchlist);
router.post('/watchlist/:movieId', addToWatchlist);
router.delete('/watchlist/:movieId', removeFromWatchlist);
router.post('/favorites/:movieId', toggleFavorite);

// Admin only routes
router.get('/', restrictTo('admin'), getUsers);
router.get('/:id', restrictTo('admin'), getUser);
router.delete('/:id', restrictTo('admin'), deleteUser);

module.exports = router;
