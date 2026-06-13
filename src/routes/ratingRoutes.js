const express = require('express');
const RatingController = require('../controllers/ratingController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { createRatingValidator, updateRatingValidator } = require('../validators/ratingValidator');

const router = express.Router();

router.get('/my/preferences', authenticate, RatingController.getMyImplicitPreferences);

router.get('/user/:userId', authenticate, RatingController.getRatingsByUser);

router.get('/:movieId', RatingController.getRatingsByMovie);

router.post(
  '/',
  authenticate,
  createRatingValidator,
  validate,
  RatingController.createRating
);

router.put(
  '/:id',
  authenticate,
  updateRatingValidator,
  validate,
  RatingController.updateRating
);

router.delete('/:id', authenticate, RatingController.deleteRating);

module.exports = router;
