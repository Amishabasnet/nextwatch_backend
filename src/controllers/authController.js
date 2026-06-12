const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendTokenResponse } = require('../utils/jwt');


// @desc    Register a new user
// @route   POST /api/auth/register  |  POST /api/v1/auth/register
// @access  Public

const register = asyncHandler(async (req, res, next) => {
  const { fullName, email, password, ageGroup, role } = req.body;

  // Prevent self-promotion to admin via API
  const assignedRole = role === 'admin' ? 'user' : (role || 'user');

  const user = await User.create({
    fullName,
    email,
    password,
    ageGroup,
    role: assignedRole,
  });

  sendTokenResponse(user, 201, res);
});


// @desc    Login user
// @route   POST /api/auth/login  |  POST /api/v1/auth/login
// @access  Public

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Select password explicitly (it's excluded by default via select: false)
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Get current logged-in user
// @route   GET /api/auth/me  |  GET /api/v1/auth/me
// @access  Private (requires JWT)

const getMe = asyncHandler(async (req, res) => {
  // req.user is attached by the protect middleware
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: { user: user.toPublicJSON() },
  });
});


// @desc    Logout (clears cookie)
// @route   POST /api/auth/logout  |  POST /api/v1/auth/logout
// @access  Private

const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

//
// @desc    Update password
// @route   PUT /api/auth/update-password  |  PUT /api/v1/auth/update-password
// @access  Private

const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

module.exports = { register, login, getMe, logout, updatePassword };
