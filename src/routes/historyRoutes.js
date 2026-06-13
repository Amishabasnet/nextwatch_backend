const express = require('express');
const HistoryController = require('../controllers/historyController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { addHistoryValidator, updateHistoryValidator } = require('../validators/historyValidator');

const router = express.Router();

router.use(authenticate);

router.post('/', addHistoryValidator, validate, HistoryController.addToHistory);
router.get('/', HistoryController.getHistory);
router.put('/:movieId', updateHistoryValidator, validate, HistoryController.updateHistoryEntry);
router.delete('/clear', HistoryController.clearHistory);
router.delete('/:movieId', HistoryController.removeFromHistory);

module.exports = router;
