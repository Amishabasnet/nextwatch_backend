const { body } = require('express-validator');

const updateRoleValidator = [
  body('role').isIn(['user', 'admin']).withMessage('role must be either "user" or "admin"'),
];

const updateStatusValidator = [
  body('status').isIn(['active', 'suspended']).withMessage('status must be either "active" or "suspended"'),
];

const createAdminValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[+]?[\d\s()-]{7,15}$/)
    .withMessage('Enter a valid phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

module.exports = { updateRoleValidator, updateStatusValidator, createAdminValidator };
