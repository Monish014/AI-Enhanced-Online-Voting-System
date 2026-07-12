const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Election title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'ended'],
      default: 'upcoming',
    },
    candidates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalVotesCast: {
      type: Number,
      default: 0,
    },
    isPublicResults: {
      type: Boolean,
      default: false, // Results visible to public only after election ends
    },
  },
  { timestamps: true }
);

// Remove the pre-update hook as timezone conversion is now handled on the frontend
// The schema-level validator on create is sufficient

module.exports = mongoose.model('Election', electionSchema);
