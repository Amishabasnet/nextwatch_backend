const express = require('express');
const {
  createPreferences,
  getPreferences,
  updatePreferences,
  deletePreferences,
} = require('../controllers/preferenceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createPreferences);
router.get('/', protect, getPreferences);
router.put('/', protect, updatePreferences);
router.delete('/:id', protect, deletePreferences);

module.exports = router;
