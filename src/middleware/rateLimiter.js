const rateLimit = require('express-rate-limit');
const { apiResponse } = require('../types/express.types');

const rateLimitHandler = (message) => (req, res) => {
  res.status(429).json(apiResponse(false, message, null));
};

// Login: brute-force protection per IP
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts from this device. Please try again later.',
  handler: rateLimitHandler('Too many login attempts from this device. Please try again later.'),
});

// Registration: prevent mass account creation from a single IP.
const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many accounts created from this device. Please try again later.',
  handler: rateLimitHandler('Too many accounts created from this device. Please try again later.'),
});

// Refresh token endpoint: generous but still bounded.
const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.',
  handler: rateLimitHandler('Too many requests. Please try again later.'),
});

// General-purpose limiter applied to the whole API as a baseline safety net.
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this device. Please try again later.',
  handler: rateLimitHandler('Too many requests from this device. Please try again later.'),
});

module.exports = {
  loginRateLimiter,
  registerRateLimiter,
  refreshRateLimiter,
  apiRateLimiter,
};
