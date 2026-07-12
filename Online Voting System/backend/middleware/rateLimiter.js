const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min

/** Standard limiter for general API routes */
const generalLimiter = rateLimit({
  windowMs,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

/** Strict limiter for auth routes (login, register, OTP) */
const authLimiter = rateLimit({
  windowMs,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true, // Only count failed requests
});

/** Very strict limiter for vote casting */
const voteLimiter = rateLimit({
  windowMs,
  max: parseInt(process.env.VOTE_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Voting rate limit exceeded. Contact support if this is an error.' },
});

/** Face-verify endpoint limiter */
const faceVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many face verification attempts. Please wait 10 minutes.' },
});

module.exports = { generalLimiter, authLimiter, voteLimiter, faceVerifyLimiter };
