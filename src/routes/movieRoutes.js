const express = require('express');
const MovieController = require('../controllers/movieController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { createMovieValidator, updateMovieValidator } = require('../validators/movieValidator');

const router = express.Router();

router.get('/', MovieController.getAllMovies);
router.get('/search', MovieController.searchMovies);
router.get('/:id', MovieController.getMovieById);

router.use(authenticate);
router.get('/personalized/for-me', MovieController.getPersonalizedMovies);

router.post('/', authorize('admin'), createMovieValidator, validate, MovieController.createMovie);
router.put('/:id', authorize('admin'), updateMovieValidator, validate, MovieController.updateMovie);
router.delete('/:id', authorize('admin'), MovieController.deleteMovie);

module.exports = router;
