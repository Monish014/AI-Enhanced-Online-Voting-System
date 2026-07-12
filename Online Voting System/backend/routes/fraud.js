const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { getAlerts, flagAlert, resolveAlert, getRiskScore, getAlertStats } = require('../controllers/fraudController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { generalLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

// All fraud routes require admin
router.use(authenticate, requireRole('admin'));

router.get('/alerts', generalLimiter, getAlerts);
router.get('/stats', generalLimiter, getAlertStats);
router.get('/risk-score/:userId', generalLimiter, getRiskScore);

router.post(
  '/flag',
  [
    body('type').isIn(['duplicate_attempt', 'bot_pattern', 'ip_cluster', 'deepfake_suspected', 'device_mismatch', 'rate_limit_breach']).withMessage('Invalid alert type'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
    body('details').optional().isString().isLength({ max: 1000 }),
  ],
  validate,
  flagAlert
);

router.put(
  '/alerts/:id/resolve',
  [body('resolverNote').optional().isString().isLength({ max: 500 })],
  validate,
  resolveAlert
);

module.exports = router;
