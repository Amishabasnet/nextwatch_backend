const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Check the request for any validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return next(new AppError(messages.join('. '), 422));
  }
  next();
};

module.exports = validate;
