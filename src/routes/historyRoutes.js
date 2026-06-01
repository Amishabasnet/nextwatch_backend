const express = require('express');
const { addHistoryEntry, getHistory, deleteHistoryEntry } = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, addHistoryEntry);
router.get('/', protect, getHistory);
router.delete('/:id', protect, deleteHistoryEntry);

module.exports = router;
