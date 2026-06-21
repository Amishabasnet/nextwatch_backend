const express = require('express');
const FeatureController = require('../controllers/featureController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// Public: anyone can view featured movies
router.get('/', FeatureController.getFeaturedMovies);

// Protected: only admins can manage homepage spotlight entries
router.use(authenticate, authorize('admin'));
router.post('/', FeatureController.addFeaturedMovie);
router.put('/:id', FeatureController.updateFeature);
router.delete('/:id', FeatureController.removeFeature);

module.exports = router;
