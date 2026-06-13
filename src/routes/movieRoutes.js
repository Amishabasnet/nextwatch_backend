const express = require('express');
const MovieController = require('../controllers/movieController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { createMovieValidator, updateMovieValidator } = require('../validators/movieValidator');

const router = express.Router();

// Public routes
router.get('/', MovieController.getAllMovies);
router.get('/search', MovieController.searchMovies);
router.get('/:id', MovieController.getMovieById);

// Protected routes
router.use(authenticate);
router.get('/personalized/for-me', MovieController.getPersonalizedMovies);
router.post('/', createMovieValidator, validate, MovieController.createMovie);
router.put('/:id', updateMovieValidator, validate, MovieController.updateMovie);
router.delete('/:id', MovieController.deleteMovie);

module.exports = router;
