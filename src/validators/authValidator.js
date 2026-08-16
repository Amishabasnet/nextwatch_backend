const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer'),
  body('email').trim().isEmail().withMessage('Valid email is required')
    .isLength({ max: 254 }).withMessage('Email is too long')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[+]?[\d\s()-]{7,15}$/)
    .withMessage('Enter a valid phone number'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),
  body('consentGiven')
    .optional()
    .isBoolean()
    .withMessage('consentGiven must be a boolean'),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required')
    .isLength({ max: 254 }).withMessage('Email is too long')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
    .isLength({ max: 128 }).withMessage('Password is too long'),
];

const updateProfileValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[+]?[\d\s()-]{7,15}$/)
    .withMessage('Enter a valid phone number'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  body('newPassword').custom((value, { req }) => {
    if (value === req.body.currentPassword) {
      throw new Error('New password must be different from current password');
    }
    return true;
  }),
];

module.exports = { registerValidator, loginValidator, updateProfileValidator, changePasswordValidator };
const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
};
