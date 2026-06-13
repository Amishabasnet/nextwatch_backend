const express = require('express');
const { getMovies, getMovieById, searchMovies } = require('../controllers/movieController');

const router = express.Router();

// Define /search BEFORE /:id to prevent route param collision
router.get('/search', searchMovies);
router.get('/', getMovies);
router.get('/:id', getMovieById);

module.exports = router;