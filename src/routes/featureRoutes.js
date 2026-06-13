const express = require('express');
const FeatureController = require('../controllers/featureController');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// Public: anyone can view featured movies
router.get('/', FeatureController.getFeaturedMovies);

// Protected: only authenticated users can manage features
router.use(authenticate);
router.post('/', FeatureController.addFeaturedMovie);
router.put('/:id', FeatureController.updateFeature);
router.delete('/:id', FeatureController.removeFeature);

module.exports = router;
