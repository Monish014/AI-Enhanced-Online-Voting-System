const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for unauthenticated actions
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      // e.g., 'LOGIN', 'LOGOUT', 'VOTE_CAST', 'FACE_VERIFY_SUCCESS',
      //        'FACE_VERIFY_FAIL', 'ELECTION_CREATED', 'FRAUD_FLAGGED', etc.
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    flaggedReason: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

// Index for efficient user-based log queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
