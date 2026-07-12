const { sendError } = require('../utils/response');

/**
 * Factory: returns middleware that restricts access to the given roles.
 * Must be used AFTER authenticate middleware.
 *
 * Usage:
 *   router.post('/create', authenticate, requireRole('admin'), createElection)
 *   router.get('/me',      authenticate, requireRole('voter', 'admin'), getProfile)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required.');
    }
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Required role: ${roles.join(' or ')}.`
      );
    }
    next();
  };
};

module.exports = { requireRole };
