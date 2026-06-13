const User = require('../models/User');
const AppError = require('../utils/AppError');

// Find a user by email and include the password for login verification
const findUserByEmail = async (email) => {
  return User.findOne({ email }).select('+password');
};

// Create and save a new user account
const createUser = async ({ name, email, password }) => {
  return User.create({
    name,
    email,
    password,
  });
};

// Check whether the email and password entered by the user are correct
const validateCredentials = async (email, password) => {
  const user = await findUserByEmail(email);

  // Return the same error for an invalid email or password
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  return user;
};

module.exports = {
  findUserByEmail,
  createUser,
  validateCredentials,
};