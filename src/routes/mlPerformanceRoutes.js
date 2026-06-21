const express = require('express');
const MLPerformanceController = require('../controllers/mlPerformanceController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = express.Router();
router.get('/', authenticate, authorize('admin'), MLPerformanceController.getMLPerformance);

module.exports = router;
