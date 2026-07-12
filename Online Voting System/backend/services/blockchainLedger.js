const crypto = require('crypto');
const Vote = require('../models/Vote');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes a SHA-256 block hash from vote data + previous block hash.
 * This creates the chain: each block's hash includes the previous hash,
 * making retroactive tampering detectable.
 */
const computeBlockHash = ({ previousBlockHash, voterHash, electionId, candidateId, timestamp }) => {
  const data = `${previousBlockHash}|${voterHash}|${electionId}|${candidateId}|${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Retrieves the hash of the most recent block in the chain for
 * a given election. Returns the genesis hash if this is the first vote.
 */
const getLatestBlockHash = async (electionId) => {
  const latest = await Vote.findOne({ electionId })
    .sort({ timestamp: -1 })
    .select('blockHash')
    .lean();
  return latest ? latest.blockHash : GENESIS_HASH;
};

/**
 * Builds a new block object (does NOT save to DB — the vote controller does that).
 *
 * Returns: { blockHash, previousBlockHash }
 */
const buildBlock = async ({ voterHash, electionId, candidateId }) => {
  const previousBlockHash = await getLatestBlockHash(electionId);
  const timestamp = new Date().toISOString();

  const blockHash = computeBlockHash({
    previousBlockHash,
    voterHash,
    electionId: electionId.toString(),
    candidateId: candidateId.toString(),
    timestamp,
  });

  return { blockHash, previousBlockHash, timestamp };
};

/**
 * Verifies whether a block hash exists in the chain.
 * Used by the public /votes/verify/:blockHash endpoint.
 */
const verifyBlockHash = async (blockHash) => {
  const vote = await Vote.findOne({ blockHash }).select('blockHash timestamp electionId').lean();
  return vote ? { exists: true, timestamp: vote.timestamp, electionId: vote.electionId } : { exists: false };
};

/**
 * Validates chain integrity for a given election.
 * Walks every vote in chronological order and re-computes each block hash.
 * Returns { valid: boolean, brokenAt: blockHash | null }.
 *
 * NOTE: This is an expensive operation — run on-demand (admin audit only).
 */
const validateChain = async (electionId) => {
  const votes = await Vote.find({ electionId })
    .sort({ timestamp: 1 })
    .select('+candidateId +encryptedPayload blockHash previousBlockHash voterHash timestamp')
    .lean();

  if (votes.length === 0) return { valid: true, brokenAt: null, blockCount: 0 };

  let expectedPrevious = GENESIS_HASH;

  for (const vote of votes) {
    const expected = computeBlockHash({
      previousBlockHash: expectedPrevious,
      voterHash: vote.voterHash,
      electionId: electionId.toString(),
      candidateId: vote.candidateId.toString(),
      timestamp: new Date(vote.timestamp).toISOString(),
    });

    if (expected !== vote.blockHash) {
      return { valid: false, brokenAt: vote.blockHash, blockCount: votes.length };
    }
    expectedPrevious = vote.blockHash;
  }

  return { valid: true, brokenAt: null, blockCount: votes.length };
};

module.exports = { buildBlock, verifyBlockHash, validateChain, GENESIS_HASH };
