const mongoose = require('mongoose');

const fraudAlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'duplicate_attempt',  // Voter tried to vote twice
        'bot_pattern',        // Vote cast too fast (< 3s)
        'ip_cluster',         // Same IP voting many accounts
        'deepfake_suspected', // Liveness check flagged
        'device_mismatch',    // Device fingerprint anomaly
        'rate_limit_breach',  // Excessive requests
      ],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      default: null,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    details: {
      type: String,
      maxlength: [1000, 'Details cannot exceed 1000 characters'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolverNote: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

fraudAlertSchema.index({ resolved: 1, severity: 1, timestamp: -1 });
fraudAlertSchema.index({ userId: 1 });

module.exports = mongoose.model('FraudAlert', fraudAlertSchema);
