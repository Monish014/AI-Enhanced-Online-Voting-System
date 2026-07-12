const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    voterId: {
      type: String,
      unique: true,
      default: () => `VTR-${uuidv4().split('-')[0].toUpperCase()}`,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?[\d\s\-()]{7,15}$/, 'Please provide a valid phone number'],
    },
    // Stored as SHA-256 hash — never raw
    aadhaarHash: {
      type: String,
      select: false,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    // Face embedding from face-api.js (Float32Array serialized as [Number])
    faceEmbedding: {
      type: [Number],
      select: false,
    },
    documentImageUrl: {
      type: String,
      default: null,
    },
    faceImageUrl: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['voter', 'admin'],
      default: 'voter',
    },
    // OTP fields
    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
    // Refresh token
    refreshToken: {
      type: String,
      select: false,
    },
    // Track failed face-verify attempts for risk scoring
    failedFaceAttempts: {
      type: Number,
      default: 0,
    },
    lastLoginAt: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare plain password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Omit sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  delete obj.refreshToken;
  delete obj.faceEmbedding;
  delete obj.aadhaarHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
