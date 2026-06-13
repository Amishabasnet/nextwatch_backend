const express = require('express');
const PreferenceController = require('../controllers/preferenceController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { preferenceValidator } = require('../validators/preferenceValidator');

const router = express.Router();

router.use(authenticate);

router.get('/', PreferenceController.getPreferences);
router.put('/', preferenceValidator, validate, PreferenceController.upsertPreferences);
router.delete('/', PreferenceController.deletePreferences);

module.exports = router;
