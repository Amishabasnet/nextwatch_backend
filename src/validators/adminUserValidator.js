const { body } = require('express-validator');

const updateRoleValidator = [
  body('role').isIn(['user', 'admin']).withMessage('role must be either "user" or "admin"'),
];

const updateStatusValidator = [
  body('status').isIn(['active', 'suspended']).withMessage('status must be either "active" or "suspended"'),
];

module.exports = { updateRoleValidator, updateStatusValidator };
