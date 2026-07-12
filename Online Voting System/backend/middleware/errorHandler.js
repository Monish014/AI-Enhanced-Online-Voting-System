const { sendError } = require('../utils/response');

/**
 * Global Express error handler — must be registered last in server.js.
 * Normalises all error types into the standard { success, message, data } shape.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl} —`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return sendError(res, 422, messages.join('. '));
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return sendError(res, 409, `A record with this ${field} already exists.`);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return sendError(res, 400, `Invalid ID format: ${err.value}`);
  }

  // JWT errors (should be caught in auth.js, but as fallback)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Invalid or expired token.');
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 413, 'File too large. Maximum size is 5 MB.');
  }

  // Multer file type error (thrown manually in config/multer.js)
  if (err.message && err.message.includes('Only JPEG')) {
    return sendError(res, 415, err.message);
  }

  // Express-validator errors forwarded as 422
  if (err.status === 422) {
    return sendError(res, 422, err.message, err.errors || null);
  }

  // Default: 500 Internal Server Error
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message;

  return sendError(res, err.status || 500, message);
};

module.exports = errorHandler;
