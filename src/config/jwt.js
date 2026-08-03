const jwt = require('jsonwebtoken');

const JWT_SECRET          = process.env.JWT_SECRET          || 'supersecretkeychangeinproduction';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET  || 'supersecretrefreshkeychangeinproduction';
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || '15m';   // short-lived access token
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';   // long-lived refresh token

const generateToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

const verifyToken = (token) =>
  jwt.verify(token, JWT_SECRET);

const verifyRefreshToken = (token) =>
  jwt.verify(token, JWT_REFRESH_SECRET);

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  JWT_REFRESH_EXPIRES,
};
