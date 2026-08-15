const express = require('express');
const AdminDashboardController = require('../controllers/adminDashboardController');
const AdminUserController = require('../controllers/adminUserController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { updateRoleValidator, updateStatusValidator, createAdminValidator } = require('../validators/adminUserValidator');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', AdminDashboardController.getDashboard);

router.post  ('/users',            ...createAdminValidator, validate, AdminUserController.createAdmin);
router.get   ('/users',            AdminUserController.getAllUsers);
router.get   ('/users/:id',        AdminUserController.getUserById);
router.patch ('/users/:id/role',   ...updateRoleValidator,   validate, AdminUserController.updateRole);
router.patch ('/users/:id/status', ...updateStatusValidator, validate, AdminUserController.updateStatus);
router.delete('/users/:id',        AdminUserController.deleteUser);

module.exports = router;
