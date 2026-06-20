const express = require('express');
const WatchlistController = require('../controllers/watchlistController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { addWatchlistValidator } = require('../validators/watchlistValidator');

const router = express.Router();

router.use(authenticate);
router.post('/', addWatchlistValidator, validate, WatchlistController.addToWatchlist);
router.get('/', WatchlistController.getWatchlist);
router.delete('/clear', WatchlistController.clearWatchlist);
router.delete('/:movieId', WatchlistController.removeFromWatchlist);

module.exports = router;
