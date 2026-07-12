const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response');

/**
 * Verifies JWT access token from Authorization: Bearer <token> header.
 * Attaches req.user (full document) and req.userId on success.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user) {
      return sendError(res, 401, 'Token is invalid — user not found.');
    }
    if (!user.isActive) {
      return sendError(res, 403, 'Account has been deactivated.');
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired. Please refresh.');
    }
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token.');
    }
    next(err);
  }
};

/**
 * Optional auth — attaches user if token present, but does not block.
 * Useful for public routes that show extra detail when logged in.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id;
    }
  } catch (_) {
    // Silently ignore invalid/expired tokens in optional mode
  }
  next();
};

module.exports = { authenticate, optionalAuth };
