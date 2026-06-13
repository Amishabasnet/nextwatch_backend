const express = require('express');
const {
  getMovies,
  getMovieById,
  searchMovies,
} = require('../controllers/movieController');

const router = express.Router();

// Keep the search route above the ID route so "search" is not treated as a movie ID
router.get('/search', searchMovies);

// Get all available movies
router.get('/', getMovies);

// Get a single movie using its ID
router.get('/:id', getMovieById);

module.exports = router;