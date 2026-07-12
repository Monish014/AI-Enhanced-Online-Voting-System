const express = require('express');
const router = express.Router();

const {
  getDashboardStats, getAuditLogs, exportResults,
  getUsers, toggleUserActive, validateElectionChain,
  getTurnoutTimeSeries, deleteUser,
} = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { generalLimiter } = require('../middleware/rateLimiter');

// All admin routes require admin role
router.use(authenticate, requireRole('admin'));

router.get('/dashboard-stats', generalLimiter, getDashboardStats);
router.get('/audit-logs', generalLimiter, getAuditLogs);
router.get('/export-results/:electionId', exportResults);
router.get('/users', generalLimiter, getUsers);
router.put('/users/:id/toggle-active', generalLimiter, toggleUserActive);
router.delete('/users/:id', generalLimiter, deleteUser);
router.get('/validate-chain/:electionId', generalLimiter, validateElectionChain);
router.get('/turnout/:electionId', generalLimiter, getTurnoutTimeSeries);

module.exports = router;
