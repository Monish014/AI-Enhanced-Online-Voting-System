const Vote = require('../models/Vote');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendError } = require('../utils/response');
const { encryptVotePayload } = require('../services/encryptionService');
const { buildBlock, verifyBlockHash } = require('../services/blockchainLedger');

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';

// ─── Cast Vote ────────────────────────────────────────────────────────────────

/**
 * POST /api/votes/cast
 * Body: electionId, candidateId, deviceFingerprint, pageLoadTime, faceToken
 * Auth: required (voter)
 * Middleware: detectFraud (runs first — attaches req.voterHash)
 */
const castVote = async (req, res, next) => {
  try {
    const { electionId, candidateId, deviceFingerprint } = req.body;
    const userId = req.userId;
    const ip = getIp(req);
    const voterHash = req.voterHash; // Set by detectFraud middleware

    // Verify election is active
    const election = await Election.findById(electionId);
    if (!election) return sendError(res, 404, 'Election not found.');
    if (election.status !== 'active') {
      return sendError(res, 400, `Voting is not open. Election status: ${election.status}`);
    }

    // Verify candidate belongs to this election
    const candidate = await Candidate.findOne({ _id: candidateId, electionId });
    if (!candidate) return sendError(res, 404, 'Candidate not found in this election.');

    // Build blockchain block
    const { blockHash, previousBlockHash, timestamp } = await buildBlock({
      voterHash,
      electionId: electionId.toString(),
      candidateId: candidateId.toString(),
    });

    // Encrypt vote payload (candidateId never stored in plaintext on Vote doc)
    const encryptedPayload = encryptVotePayload({
      voterId: userId.toString(),
      electionId: electionId.toString(),
      candidateId: candidateId.toString(),
      timestamp,
    });

    // Calculate cast duration
    const castDurationMs = req.body.pageLoadTime
      ? Date.now() - new Date(req.body.pageLoadTime).getTime()
      : null;

    // Persist the vote
    const vote = await Vote.create({
      electionId,
      voterHash,
      candidateId,
      encryptedPayload,
      blockHash,
      previousBlockHash,
      timestamp: new Date(timestamp),
      ipAddress: ip,
      deviceFingerprint,
      castDurationMs,
    });

    // Increment candidate vote count and election total atomically
    await Promise.all([
      Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } }),
      Election.findByIdAndUpdate(electionId, { $inc: { totalVotesCast: 1 } }),
    ]);

    // Audit log
    await AuditLog.create({
      userId,
      action: 'VOTE_CAST',
      ipAddress: ip,
      riskScore: req.fraudFlags?.length > 0 ? 40 : 0,
      flaggedReason: req.fraudFlags?.join(',') || null,
      metadata: { electionId, blockHash, fraudFlags: req.fraudFlags },
    });

    // Notify admin dashboard of new vote (no candidate revealed)
    req.app.get('io')?.to('admin-room').emit('vote-cast', {
      electionId,
      blockHash,
      timestamp,
      fraudFlags: req.fraudFlags || [],
    });

    return sendSuccess(res, 201, 'Vote cast successfully.', {
      blockHash,
      timestamp,
      electionId,
      receipt: `Your vote has been recorded. Block hash: ${blockHash}`,
    });
  } catch (err) {
    // Duplicate key error = double-vote attempt that slipped fraud check
    if (err.code === 11000) {
      return sendError(res, 409, 'You have already voted in this election.');
    }
    next(err);
  }
};

// ─── Verify Vote (Public) ─────────────────────────────────────────────────────

/**
 * GET /api/votes/verify/:blockHash
 * Public route — confirms a hash exists on the chain without revealing the choice.
 */
const verifyVote = async (req, res, next) => {
  try {
    const { blockHash } = req.params;
    const result = await verifyBlockHash(blockHash);

    if (result.exists) {
      return sendSuccess(res, 200, 'Vote verified — your vote is on record.', {
        verified: true,
        timestamp: result.timestamp,
        electionId: result.electionId,
      });
    }
    return sendSuccess(res, 200, 'No vote found for this block hash.', { verified: false });
  } catch (err) {
    next(err);
  }
};

// ─── Get Results ──────────────────────────────────────────────────────────────

/**
 * GET /api/votes/results/:electionId
 * - Public if election.isPublicResults && status === 'ended'
 * - Admin can always view
 */
const getResults = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const election = await Election.findById(electionId).lean();
    if (!election) return sendError(res, 404, 'Election not found.');

    const isAdmin = req.user?.role === 'admin';
    const isPublic = election.isPublicResults && election.status === 'ended';

    if (!isAdmin && !isPublic) {
      return sendError(res, 403, 'Results are not yet available for this election.');
    }

    const candidates = await Candidate.find({ electionId })
      .select('name party symbol imageUrl voteCount')
      .lean();

    const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
    const results = candidates
      .map((c) => ({
        ...c,
        percentage: totalVotes > 0 ? parseFloat(((c.voteCount / totalVotes) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    return sendSuccess(res, 200, 'Results retrieved.', {
      election: { id: election._id, title: election.title, status: election.status },
      totalVotes,
      results,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Check if User Voted ──────────────────────────────────────────────────────

/**
 * GET /api/votes/status/:electionId
 * Returns whether the authenticated voter has already voted.
 */
const checkVoteStatus = async (req, res, next) => {
  try {
    const { electionId } = req.params;
    const { computeVoterHash } = require('../utils/hashUtils');
    const voterHash = computeVoterHash(req.userId.toString(), electionId);
    const voted = await Vote.exists({ voterHash, electionId });
    return sendSuccess(res, 200, 'Vote status retrieved.', { hasVoted: !!voted });
  } catch (err) {
    next(err);
  }
};

module.exports = { castVote, verifyVote, getResults, checkVoteStatus };
