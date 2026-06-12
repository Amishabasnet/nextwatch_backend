const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Finds a user by email, including the hashed password field.
 * Throws if not found (avoids leaking email existence via timing).
 */
const findUserByEmail = async (email) => {
  return User.findOne({ email }).select('+password');
};

/**
 * Creates a new user document.
 */
const createUser = async ({ name, email, password }) => {
  return User.create({ name, email, password });
};

/**
 * Validates credentials and returns the user if valid.
 */
const validateCredentials = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  return user;
};

module.exports = { findUserByEmail, createUser, validateCredentials };
