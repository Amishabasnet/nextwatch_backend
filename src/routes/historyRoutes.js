const express = require('express');
const { addHistoryEntry, getHistory } = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, addHistoryEntry);
router.get('/', protect, getHistory);

module.exports = router;
