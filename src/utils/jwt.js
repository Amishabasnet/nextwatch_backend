const jwt = require('jsonwebtoken');

// Create a new JWT using the provided user information
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

// Check whether a token is valid and return the information stored inside it
const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

// Create a token, save it in a secure cookie and send the login response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  // Set the expiry and security options for the token cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() +
        Number(process.env.JWT_COOKIE_EXPIRE) *
          24 *
          60 *
          60 *
          1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  // Send the token and public user details to the client
  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      data: {
        user: user.toPublicJSON
          ? user.toPublicJSON()
          : {
              _id: user._id,
              role: user.role,
            },
      },
    });
};

module.exports = {
  signToken,
  verifyToken,
  sendTokenResponse,
};