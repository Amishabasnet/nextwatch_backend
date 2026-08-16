const jwt = require('jsonwebtoken');

const JWT_SECRET          = process.env.JWT_SECRET          || 'supersecretkeychangeinproduction';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET  || 'supersecretrefreshkeychangeinproduction';
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || '15m';   // short-lived access token
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';   // long-lived refresh token

const generateToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

// password reset token are short lived
const RESET_TOKEN_EXPIRES = process.env.RESET_TOKEN_EXPIRES || '15m';

const generateResetToken = ({ id, pwdSig }) =>
  jwt.sign({ id, pwdSig, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: RESET_TOKEN_EXPIRES });

const verifyResetToken = (token) => {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.purpose !== 'password_reset') {
    throw new Error('Invalid token purpose');
  }
  return payload;
};

const verifyToken = (token) =>
  jwt.verify(token, JWT_SECRET);

const verifyRefreshToken = (token) =>
  jwt.verify(token, JWT_REFRESH_SECRET);

module.exports = {
  generateToken,
  generateRefreshToken,
  generateResetToken,
  verifyResetToken,
  verifyToken,
  verifyRefreshToken,
  JWT_REFRESH_EXPIRES,
};
