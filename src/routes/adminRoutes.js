const express = require('express');
const AdminDashboardController = require('../controllers/adminDashboardController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.get('/dashboard', authenticate, authorize('admin'), AdminDashboardController.getDashboard);

module.exports = router;
