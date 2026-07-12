const AuditLog = require('../models/AuditLog');
const FraudAlert = require('../models/FraudAlert');

/**
 * Calculates a composite risk score (0–100) for a given user.
 *
 * Factors:
 * - Failed face-verify attempts (×10 each, max 30)
 * - Number of fraud alerts linked to user (×15 each, max 45)
 * - IP address changes in last 24h (×5 each over 3 unique IPs)
 * - Unusual login hours (activity between 01:00–05:00 local = +10)
 */
const calculateUserRiskScore = async (userId) => {
  const [auditLogs, fraudAlerts] = await Promise.all([
    AuditLog.find({ userId }).sort({ timestamp: -1 }).limit(50).lean(),
    FraudAlert.find({ userId, resolved: false }).lean(),
  ]);

  let score = 0;

  // Failed face attempts
  const failedFace = auditLogs.filter((l) => l.action === 'FACE_VERIFY_FAIL').length;
  score += Math.min(failedFace * 10, 30);

  // Open fraud alerts
  score += Math.min(fraudAlerts.length * 15, 45);

  // IP diversity in last 24 hours
  const since24h = Date.now() - 24 * 60 * 60 * 1000;
  const recentIps = new Set(
    auditLogs
      .filter((l) => new Date(l.timestamp).getTime() > since24h && l.ipAddress)
      .map((l) => l.ipAddress)
  );
  if (recentIps.size > 3) score += (recentIps.size - 3) * 5;

  // Unusual hour logins (01:00–05:00)
  const oddHourLogins = auditLogs.filter((l) => {
    const h = new Date(l.timestamp).getUTCHours();
    return l.action === 'LOGIN' && h >= 1 && h <= 5;
  }).length;
  if (oddHourLogins > 0) score += 10;

  return Math.min(100, score);
};

module.exports = { calculateUserRiskScore };
