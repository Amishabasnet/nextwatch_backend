const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const {
  loginRateLimiter,
  registerRateLimiter,
  refreshRateLimiter,
} = require('../middleware/rateLimiter');
const {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
} = require('../validators/authValidator');

const router = express.Router();

router.post('/register', registerRateLimiter, ...registerValidator, validate, AuthController.register);
router.post('/login',    loginRateLimiter,    ...loginValidator,    validate, AuthController.login);

router.post('/refresh', refreshRateLimiter, AuthController.refresh);

router.get ('/profile',  authenticate, AuthController.getProfile);
router.put ('/profile',  authenticate, ...updateProfileValidator, validate, AuthController.updateProfile);
router.put ('/password', authenticate, ...changePasswordValidator, validate, AuthController.changePassword);
router.post('/logout',   authenticate, AuthController.logout);

module.exports = router;
