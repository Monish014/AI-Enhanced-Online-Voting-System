const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: true,
    },
    // HMAC-SHA256 of userId + electionId — anonymizes the voter while
    // preventing double-voting without exposing the voter's identity.
    voterHash: {
      type: String,
      required: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      select: false, // Never expose actual choice in queries by default
    },
    // AES-256 encrypted payload containing the vote details
    encryptedPayload: {
      type: String,
      required: true,
      select: false,
    },
    // SHA-256 hash of (previousBlockHash + voterHash + electionId + timestamp)
    blockHash: {
      type: String,
      required: true,
      unique: true,
    },
    // Hash of the preceding block — forms the chain
    previousBlockHash: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Metadata for fraud detection
    ipAddress: {
      type: String,
    },
    deviceFingerprint: {
      type: String,
    },
    // Time (ms) from election page load to vote submission
    castDurationMs: {
      type: Number,
    },
  },
  {
    timestamps: false, // We manage timestamp manually for chain integrity
  }
);

// Compound index: one vote per voter per election
voteSchema.index({ voterHash: 1, electionId: 1 }, { unique: true });
// Note: blockHash already has a unique index via `unique: true` in the field definition

module.exports = mongoose.model('Vote', voteSchema);
