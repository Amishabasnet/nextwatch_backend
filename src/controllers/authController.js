const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendTokenResponse } = require('../utils/jwt');

// Register a new user account
const register = asyncHandler(async (req, res, next) => {
  const { fullName, email, password, ageGroup, role } = req.body;

  // Do not allow users to register themselves as an admin
  const assignedRole = role === 'admin' ? 'user' : role || 'user';

  const user = await User.create({
    fullName,
    email,
    password,
    ageGroup,
    role: assignedRole,
  });

  // Send the user information together with a login token
  sendTokenResponse(user, 201, res);
});

// Log in an existing user
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // The password is hidden by default, so include it for verification
  const user = await User.findOne({ email }).select('+password');

  // Check whether the account exists and the password is correct
  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Send a token after a successful login
  sendTokenResponse(user, 200, res);
});

// Get the details of the currently logged-in user
const getMe = asyncHandler(async (req, res) => {
  // The authentication middleware adds the user details to the request
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      user: user.toPublicJSON(),
    },
  });
});

// Log out the current user
const logout = asyncHandler(async (req, res) => {
  // Replace the token cookie with an expired value
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Change the password of the currently logged-in user
const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Include the saved password so the current password can be checked
  const user = await User.findById(req.user.id).select('+password');

  // Make sure the current password entered by the user is correct
  if (!(await user.matchPassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Save the new password
  user.password = newPassword;
  await user.save();

  // Send a new token after the password has been updated
  sendTokenResponse(user, 200, res);
});

module.exports = {
  register,
  login,
  getMe,
  logout,
  updatePassword,
};