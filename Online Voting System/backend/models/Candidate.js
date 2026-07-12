const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    party: {
      type: String,
      trim: true,
      maxlength: [100, 'Party name cannot exceed 100 characters'],
      default: 'Independent',
    },
    symbol: {
      type: String,
      trim: true,
      maxlength: [50, 'Symbol cannot exceed 50 characters'],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    electionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election',
      required: [true, 'Election ID is required'],
    },
    voteCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Candidate', candidateSchema);
