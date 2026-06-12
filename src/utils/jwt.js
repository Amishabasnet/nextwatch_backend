const jwt = require('jsonwebtoken');

/**
 * Sign a JWT with a given payload.
 */
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

/**
 * Verify a JWT — returns decoded payload, throws on invalid/expired.
 */
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

/**
 * Generates a JWT, attaches it as an httpOnly cookie, and sends the response.
 * Used by register, login, and update-password.
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    expires: new Date(
      Date.now() + Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      data: {
        user: user.toPublicJSON ? user.toPublicJSON() : { _id: user._id, role: user.role },
      },
    });
};

module.exports = { signToken, verifyToken, sendTokenResponse };
