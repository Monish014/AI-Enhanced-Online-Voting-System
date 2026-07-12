const Vote = require('../models/Vote');
const FraudAlert = require('../models/FraudAlert');
const AuditLog = require('../models/AuditLog');
const { computeVoterHash } = require('../utils/hashUtils');

// In-memory window for IP vote tracking (production: use Redis)
// Map<ipAddress, { count: number, voterIds: Set, firstSeen: Date }>
const ipVoteWindow = new Map();
const IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const IP_VOTER_THRESHOLD = 5; // Flag if same IP votes for >5 different accounts in window

/**
 * Cleans up stale IP entries older than the window.
 */
const cleanIpWindow = () => {
  const cutoff = Date.now() - IP_WINDOW_MS;
  for (const [ip, data] of ipVoteWindow.entries()) {
    if (data.firstSeen < cutoff) ipVoteWindow.delete(ip);
  }
};

/**
 * Core fraud detection middleware — runs before vote is cast.
 * Checks:
 *  1. Duplicate vote attempt
 *  2. Bot-pattern (cast < 3 seconds after page load)
 *  3. IP clustering (same IP, many voter accounts)
 *  4. Liveness flag from face-verify step
 *
 * Attaches req.fraudFlags = [] (array of detected issue types).
 * A 'duplicate_attempt' is an immediate block; others are flags.
 */
const detectFraud = async (req, res, next) => {
  try {
    const { electionId, pageLoadTime, deviceFingerprint } = req.body;
    const userId = req.userId;
    const ip = req.ip || req.connection.remoteAddress;
    const io = req.app.get('io');

    req.fraudFlags = [];
    req.clientIp = ip;

    // 1. Duplicate vote check
    const voterHash = computeVoterHash(userId.toString(), electionId);
    const existingVote = await Vote.findOne({ voterHash, electionId });
    if (existingVote) {
      await createFraudAlert({
        type: 'duplicate_attempt',
        userId,
        electionId,
        severity: 'critical',
        details: `Voter ${userId} attempted to vote twice in election ${electionId}`,
        metadata: { ip, deviceFingerprint },
      }, io);

      await AuditLog.create({
        userId,
        action: 'DUPLICATE_VOTE_ATTEMPT',
        ipAddress: ip,
        riskScore: 100,
        flaggedReason: 'duplicate_attempt',
        metadata: { electionId },
      });

      return res.status(409).json({
        success: false,
        message: 'You have already voted in this election.',
      });
    }

    // 2. Bot-pattern: vote cast suspiciously fast (< 3 seconds from page load)
    if (pageLoadTime) {
      const elapsed = Date.now() - new Date(pageLoadTime).getTime();
      if (elapsed < 3000) {
        req.fraudFlags.push('bot_pattern');
        await createFraudAlert({
          type: 'bot_pattern',
          userId,
          electionId,
          severity: 'high',
          details: `Vote cast ${elapsed}ms after page load — possible bot`,
          metadata: { elapsed, ip, deviceFingerprint },
        }, io);
      }
    }

    // 3. IP clustering check
    cleanIpWindow();
    if (!ipVoteWindow.has(ip)) {
      ipVoteWindow.set(ip, { count: 0, voterIds: new Set(), firstSeen: Date.now() });
    }
    const ipData = ipVoteWindow.get(ip);
    ipData.count += 1;
    ipData.voterIds.add(userId.toString());

    if (ipData.voterIds.size > IP_VOTER_THRESHOLD) {
      req.fraudFlags.push('ip_cluster');
      await createFraudAlert({
        type: 'ip_cluster',
        userId,
        electionId,
        severity: 'high',
        details: `IP ${ip} used by ${ipData.voterIds.size} different voter accounts within 10 minutes`,
        metadata: { ip, voterCount: ipData.voterIds.size, deviceFingerprint },
      }, io);
    }

    // 4. Liveness flag passed from face-verify session
    if (req.body.livenessFlag === false || req.body.livenessFlag === 'false') {
      req.fraudFlags.push('deepfake_suspected');
      await createFraudAlert({
        type: 'deepfake_suspected',
        userId,
        electionId,
        severity: 'critical',
        details: 'Liveness check failed at time of voting — deepfake suspected',
        metadata: { ip, deviceFingerprint },
      }, io);
    }

    // Attach computed voterHash so vote controller doesn't recompute
    req.voterHash = voterHash;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Helper: persists a FraudAlert and emits real-time socket event to admin room.
 */
const createFraudAlert = async (data, io) => {
  try {
    const alert = await FraudAlert.create(data);
    if (io) {
      io.to('admin-room').emit('fraud-alert', {
        id: alert._id,
        type: alert.type,
        severity: alert.severity,
        details: alert.details,
        timestamp: alert.timestamp,
      });
    }
    return alert;
  } catch (err) {
    console.error('[FraudDetection] createFraudAlert error:', err.message);
  }
};

module.exports = { detectFraud, createFraudAlert };
