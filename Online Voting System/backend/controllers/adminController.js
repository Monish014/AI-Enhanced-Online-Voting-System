const User = require('../models/User');
const Election = require('../models/Election');
const Vote = require('../models/Vote');
const FraudAlert = require('../models/FraudAlert');
const AuditLog = require('../models/AuditLog');
const Candidate = require('../models/Candidate');
const { sendSuccess, sendError } = require('../utils/response');
const { validateChain } = require('../services/blockchainLedger');

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard-stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalVoters,
      activeElections,
      totalElections,
      openAlerts,
      recentAlerts,
      votesToday,
    ] = await Promise.all([
      User.countDocuments({ role: 'voter', isVerified: true }),
      Election.countDocuments({ status: 'active' }),
      Election.countDocuments(),
      FraudAlert.countDocuments({ resolved: false }),
      FraudAlert.find({ resolved: false })
        .sort({ timestamp: -1 })
        .limit(5)
        .populate('userId', 'name email')
        .lean(),
      Vote.countDocuments({
        timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    // Turnout: votes cast / verified voters (overall approximation)
    const totalVotesCast = await Vote.countDocuments();
    const turnoutPercent =
      totalVoters > 0 ? parseFloat(((totalVotesCast / totalVoters) * 100).toFixed(2)) : 0;

    return sendSuccess(res, 200, 'Dashboard stats retrieved.', {
      totalVoters,
      totalVotesCast,
      votesToday,
      activeElections,
      totalElections,
      openAlerts,
      turnoutPercent,
      recentAlerts,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/audit-logs
 * Query: userId, action, from, to, page, limit
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { userId, action, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = new RegExp(action, 'i');
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email voterId')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Audit logs retrieved.', {
      logs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Export Results ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/export-results/:electionId
 * Returns CSV-formatted results as a downloadable response.
 */
const exportResults = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const election = await Election.findById(electionId).lean();
    if (!election) return sendError(res, 404, 'Election not found.');

    const candidates = await Candidate.find({ electionId })
      .select('name party symbol voteCount')
      .sort({ voteCount: -1 })
      .lean();

    const totalVotes = candidates.reduce((s, c) => s + c.voteCount, 0);

    // Build CSV
    const rows = [
      ['Rank', 'Candidate', 'Party', 'Symbol', 'Votes', 'Percentage'],
      ...candidates.map((c, i) => [
        i + 1,
        `"${c.name}"`,
        `"${c.party || 'Independent'}"`,
        `"${c.symbol || ''}"`,
        c.voteCount,
        totalVotes > 0 ? `${((c.voteCount / totalVotes) * 100).toFixed(2)}%` : '0%',
      ]),
      [],
      [`Total Votes Cast`, totalVotes],
      [`Election`, `"${election.title}"`],
      [`Status`, election.status],
      [`Exported At`, new Date().toISOString()],
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const filename = `results-${election.title.replace(/\s+/g, '_')}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Query: role, isVerified, page, limit, search
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, isVerified, search, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { voterId: new RegExp(search, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Users retrieved.', {
      users,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/users/:id/toggle-active
 * Activate/deactivate a voter account
 */
const toggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found.');
    if (user.role === 'admin') return sendError(res, 403, 'Cannot deactivate admin accounts this way.');

    user.isActive = !user.isActive;
    await user.save();

    await AuditLog.create({
      userId: req.userId,
      action: user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      metadata: { targetUserId: user._id },
    });

    return sendSuccess(res, 200, `User ${user.isActive ? 'activated' : 'deactivated'}.`, {
      userId: user._id, isActive: user.isActive,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Chain Integrity Check ────────────────────────────────────────────────────

/**
 * GET /api/admin/validate-chain/:electionId
 */
const validateElectionChain = async (req, res, next) => {
  try {
    const result = await validateChain(req.params.electionId);
    return sendSuccess(res, 200, result.valid ? 'Chain is intact.' : 'Chain integrity violation detected!', result);
  } catch (err) {
    next(err);
  }
};

// ─── Turnout Time-Series ──────────────────────────────────────────────────────

/**
 * GET /api/admin/turnout/:electionId
 * Returns vote counts grouped by hour for line chart.
 */
const getTurnoutTimeSeries = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const series = await Vote.aggregate([
      { $match: { electionId: require('mongoose').Types.ObjectId.createFromHexString(electionId) } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
    ]);

    const formatted = series.map((s) => ({
      time: `${s._id.year}-${String(s._id.month).padStart(2, '0')}-${String(s._id.day).padStart(2, '0')} ${String(s._id.hour).padStart(2, '0')}:00`,
      votes: s.count,
    }));

    return sendSuccess(res, 200, 'Turnout time series retrieved.', formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a voter account (admin cannot be deleted this way)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found.');
    if (user.role === 'admin') return sendError(res, 403, 'Cannot delete admin accounts.');

    await user.deleteOne();

    await AuditLog.create({
      userId: req.userId,
      action: 'USER_DELETED',
      metadata: { deletedUserId: user._id, email: user.email, voterId: user.voterId },
    });

    return sendSuccess(res, 200, `Voter ${user.voterId} deleted successfully.`);
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getDashboardStats, getAuditLogs, exportResults,
  getUsers, toggleUserActive, validateElectionChain,
  getTurnoutTimeSeries, deleteUser,
};
