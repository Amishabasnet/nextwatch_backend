const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  logout,
  updatePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Validation rule sets 
const registerRules = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 80 }).withMessage('Full name cannot exceed 80 characters'),

  body('email')
    .isEmail().withMessage('A valid email is required')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),

  body('ageGroup')
    .notEmpty().withMessage('Age group is required')
    .isIn(['under-13', '13-17', '18-24', '25-34', '35-44', '45-54', '55+'])
    .withMessage('Age group must be one of: under-13, 13-17, 18-24, 25-34, 35-44, 45-54, 55+'),

  body('role')
    .optional()
    .isIn(['user', 'admin']).withMessage('Role must be user or admin'),
];

const loginRules = [
  body('email')
    .isEmail().withMessage('A valid email is required')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

const updatePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/\d/).withMessage('New password must contain at least one number'),
];

// Routes 

// POST /api/auth/register  — create account
router.post('/register', registerRules, validate, register);

// POST /api/auth/login  — authenticate and receive JWT
router.post('/login', loginRules, validate, login);

// GET  /api/auth/me  — fetch authenticated user's profile
router.get('/me', protect, getMe);

// POST /api/auth/logout  — clear auth cookie
router.post('/logout', protect, logout);

// PUT  /api/auth/update-password  — change password (authenticated)
router.put('/update-password', protect, updatePasswordRules, validate, updatePassword);

module.exports = router;
