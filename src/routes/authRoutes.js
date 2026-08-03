const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const {
  registerValidator,
  loginValidator,
  updateProfileValidator,
} = require('../validators/authValidator');

const router = express.Router();

router.post('/register', ...registerValidator, validate, AuthController.register);
router.post('/login',    ...loginValidator,    validate, AuthController.login);

router.post('/refresh', AuthController.refresh);

router.get ('/profile', authenticate, AuthController.getProfile);
router.put ('/profile', authenticate, ...updateProfileValidator, validate, AuthController.updateProfile);
router.post('/logout',  authenticate, AuthController.logout);

module.exports = router;
