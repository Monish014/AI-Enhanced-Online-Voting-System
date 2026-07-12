const mongoose = require('mongoose');

const chatbotQuerySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Allow anonymous queries
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
      maxlength: [1000, 'Question cannot exceed 1000 characters'],
    },
    answer: {
      type: String,
      trim: true,
      maxlength: [5000, 'Answer cannot exceed 5000 characters'],
    },
    intent: {
      type: String,
      default: null, // NLP-detected intent
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    responseTimeMs: {
      type: Number,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

chatbotQuerySchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('ChatbotQuery', chatbotQuerySchema);
