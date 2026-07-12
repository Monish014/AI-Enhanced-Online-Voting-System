const FraudAlert = require('../models/FraudAlert');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendError } = require('../utils/response');
const { calculateUserRiskScore } = require('../services/riskScoreService');

// ─── Get All Alerts ───────────────────────────────────────────────────────────

/**
 * GET /api/fraud/alerts
 * Query: type, severity, resolved, page, limit
 * Admin only
 */
const getAlerts = async (req, res, next) => {
  try {
    const { type, severity, resolved, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (resolved !== undefined) filter.resolved = resolved === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [alerts, total] = await Promise.all([
      FraudAlert.find(filter)
        .populate('userId', 'name email voterId')
        .populate('electionId', 'title')
        .populate('resolvedBy', 'name')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FraudAlert.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Fraud alerts retrieved.', {
      alerts,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Flag Manually ────────────────────────────────────────────────────────────

/**
 * POST /api/fraud/flag
 * Admin only — manually flag an incident
 */
const flagAlert = async (req, res, next) => {
  try {
    const { type, userId, electionId, severity, details, metadata } = req.body;
    const alert = await FraudAlert.create({ type, userId, electionId, severity, details, metadata });

    req.app.get('io')?.to('admin-room').emit('fraud-alert', {
      id: alert._id, type: alert.type, severity: alert.severity,
      details: alert.details, timestamp: alert.timestamp,
    });

    return sendSuccess(res, 201, 'Fraud alert created.', alert);
  } catch (err) {
    next(err);
  }
};

// ─── Resolve Alert ────────────────────────────────────────────────────────────

/**
 * PUT /api/fraud/alerts/:id/resolve
 * Admin only
 */
const resolveAlert = async (req, res, next) => {
  try {
    const { resolverNote } = req.body;
    const alert = await FraudAlert.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          resolved: true,
          resolvedBy: req.userId,
          resolvedAt: new Date(),
          resolverNote: resolverNote || null,
        },
      },
      { new: true }
    ).populate('resolvedBy', 'name');

    if (!alert) return sendError(res, 404, 'Alert not found.');

    await AuditLog.create({
      userId: req.userId,
      action: 'FRAUD_ALERT_RESOLVED',
      metadata: { alertId: alert._id, type: alert.type },
    });

    req.app.get('io')?.to('admin-room').emit('alert-resolved', { id: alert._id });

    return sendSuccess(res, 200, 'Alert resolved.', alert);
  } catch (err) {
    next(err);
  }
};

// ─── Risk Score ───────────────────────────────────────────────────────────────

/**
 * GET /api/fraud/risk-score/:userId
 * Admin only
 */
const getRiskScore = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const score = await calculateUserRiskScore(userId);

    const recentAlerts = await FraudAlert.find({ userId, resolved: false })
      .sort({ timestamp: -1 })
      .limit(5)
      .select('type severity timestamp details')
      .lean();

    return sendSuccess(res, 200, 'Risk score calculated.', { userId, riskScore: score, recentAlerts });
  } catch (err) {
    next(err);
  }
};

// ─── Alert Stats ──────────────────────────────────────────────────────────────

/**
 * GET /api/fraud/stats
 * Admin only — summary counts by type and severity
 */
const getAlertStats = async (req, res, next) => {
  try {
    const [bySeverity, byType, unresolved] = await Promise.all([
      FraudAlert.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      FraudAlert.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      FraudAlert.countDocuments({ resolved: false }),
    ]);

    return sendSuccess(res, 200, 'Fraud stats retrieved.', { bySeverity, byType, unresolved });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAlerts, flagAlert, resolveAlert, getRiskScore, getAlertStats };
