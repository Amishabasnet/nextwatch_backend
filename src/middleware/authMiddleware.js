const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Check that the user is logged in before allowing access
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Get the token from the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Use the token stored in cookies when no header token is available
    token = req.cookies.token;
  }

  // Stop the request when no login token is provided
  if (!token) {
    return next(new AppError('Not authorised. Please log in.', 401));
  }

  // Check the token and get the user ID stored inside it
  const decoded = verifyToken(token);

  // Find the user linked to the token
  const currentUser = await User.findById(decoded.id);

  // Reject the request when the user account no longer exists
  if (!currentUser) {
    return next(new AppError('User no longer exists.', 401));
  }

  // Add the logged-in user to the request for the next middleware
  req.user = currentUser;
  next();
});

// Allow access only to users with the required role
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check whether the user's role is allowed to use this route
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }

    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};