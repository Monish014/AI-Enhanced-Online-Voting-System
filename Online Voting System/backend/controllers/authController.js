const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendError } = require('../utils/response');
const { hashAadhaar, generateOTP, computeVoterHash } = require('../utils/hashUtils');
const { compareFaces, validateDescriptor, calculateFaceRiskScore } = require('../services/faceMatchService');
const { createFraudAlert } = require('../middleware/fraudDetection');
const { sendOtpEmail } = require('../services/emailService');

// ─── Token Helpers ────────────────────────────────────────────────────────────

const signAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: name, email, phone, aadhaarNumber, password
 * Files: faceImage (optional at registration — can be enrolled later), documentImage
 */
const register = async (req, res, next) => {
  try {
    const { name, email, phone, aadhaarNumber, password } = req.body;
    const ip = getIp(req);

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return sendError(res, 409, 'An account with this email or phone already exists.');
    }

    const userData = { name, email, phone, password };

    if (aadhaarNumber) {
      userData.aadhaarHash = hashAadhaar(aadhaarNumber);
    }
    if (req.files?.documentImage?.[0]) {
      userData.documentImageUrl = `/uploads/documents/${req.files.documentImage[0].filename}`;
    }
    if (req.files?.faceImage?.[0]) {
      userData.faceImageUrl = `/uploads/faces/${req.files.faceImage[0].filename}`;
    }

    // Generate OTP for phone/email verification
    const otp = generateOTP(6);
    const otpExpiry = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000);
    userData.otp = otp;
    userData.otpExpiry = otpExpiry;

    const user = await User.create(userData);

    // In development: auto-verify the account so no OTP is needed
    if (process.env.NODE_ENV === 'development') {
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
    }

    // Send OTP via email (production only)
    let emailResult = { success: false };
    if (process.env.NODE_ENV !== 'development') {
      emailResult = await sendOtpEmail({ to: email, name, otp });
    }

    const responseData = {
      userId: user._id,
      voterId: user.voterId,
      email: user.email,
      autoVerified: process.env.NODE_ENV === 'development',
    };

    await AuditLog.create({ userId: user._id, action: 'REGISTER', ipAddress: ip });

    const message = process.env.NODE_ENV === 'development'
      ? 'Registration successful. Account auto-verified — you can now log in.'
      : 'Registration successful. Please verify your OTP.';

    return sendSuccess(res, 201, message, responseData);
  } catch (err) {
    next(err);
  }
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/verify-otp
 * Body: userId, otp
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    const ip = getIp(req);

    const user = await User.findById(userId).select('+otp +otpExpiry');
    if (!user) return sendError(res, 404, 'User not found.');
    if (user.isVerified) return sendError(res, 400, 'Account is already verified.');
    if (!user.otp || user.otp !== otp) return sendError(res, 400, 'Invalid OTP.');
    if (new Date() > user.otpExpiry) return sendError(res, 400, 'OTP has expired. Please register again.');

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    await AuditLog.create({ userId: user._id, action: 'OTP_VERIFIED', ipAddress: ip });

    return sendSuccess(res, 200, 'Account verified successfully. You can now log in.');
  } catch (err) {
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: email, password
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = getIp(req);

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      await AuditLog.create({
        userId: user?._id || null,
        action: 'LOGIN_FAIL',
        ipAddress: ip,
        riskScore: 20,
        flaggedReason: 'invalid_credentials',
      });
      return sendError(res, 401, 'Invalid email or password.');
    }

    // Auto-verify unverified accounts in development
    if (!user.isVerified) {
      if (process.env.NODE_ENV === 'development') {
        user.isVerified = true;
        await user.save();
      } else {
        return sendError(res, 403, 'Account not verified. Please check your OTP.');
      }
    }
    if (!user.isActive) {
      return sendError(res, 403, 'Account has been deactivated. Contact support.');
    }

    const accessToken = signAccessToken(user._id, user.role);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    await user.save();

    await AuditLog.create({ userId: user._id, action: 'LOGIN', ipAddress: ip });

    return sendSuccess(res, 200, 'Login successful.', {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        voterId: user.voterId,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Face Verify ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/face-verify
 * Body: faceDescriptor (number[128]), livenessPass (boolean)
 * Auth: required
 */
const faceVerify = async (req, res, next) => {
  try {
    const { faceDescriptor, livenessPass } = req.body;
    const userId = req.userId;
    const ip = getIp(req);
    const io = req.app.get('io');

    if (!validateDescriptor(faceDescriptor)) {
      return sendError(res, 422, 'Invalid face descriptor. Expected 128-element number array.');
    }

    const user = await User.findById(userId).select('+faceEmbedding +failedFaceAttempts');
    if (!user) return sendError(res, 404, 'User not found.');

    let isFirstEnrollment = false;

    // If no face enrollment exists, enroll now with the submitted descriptor
    if (!user.faceEmbedding || user.faceEmbedding.length === 0) {
      user.faceEmbedding = faceDescriptor;
      await user.save();
      isFirstEnrollment = true;
      console.log(`[FaceVerify] Face auto-enrolled for user ${userId}`);
    }

    if (!livenessPass) {
      user.failedFaceAttempts += 1;
      await user.save();

      await createFraudAlert({
        type: 'deepfake_suspected',
        userId,
        severity: 'critical',
        details: `Liveness check failed for user ${userId}`,
        metadata: { ip },
      }, io);

      await AuditLog.create({
        userId, action: 'FACE_VERIFY_FAIL', ipAddress: ip,
        riskScore: 80, flaggedReason: 'liveness_failed',
      });

      return sendError(res, 401, 'Liveness check failed. Please try again.');
    }

    const { match, distance, similarity } = isFirstEnrollment
      ? { match: true, distance: 0, similarity: 1 }
      : compareFaces(user.faceEmbedding, faceDescriptor);
    const riskScore = calculateFaceRiskScore({
      match, distance, livenessPass, failedAttempts: user.failedFaceAttempts,
    });

    if (!match && !isFirstEnrollment) {
      user.failedFaceAttempts += 1;
      await user.save();

      await AuditLog.create({
        userId, action: 'FACE_VERIFY_FAIL', ipAddress: ip,
        riskScore, flaggedReason: `distance_${distance}`,
      });

      return sendError(res, 401, 'Face verification failed. Identity not confirmed.', { distance, similarity });
    }

    // Success — reset failed attempts
    user.failedFaceAttempts = 0;
    await user.save();

    await AuditLog.create({
      userId, action: 'FACE_VERIFY_SUCCESS', ipAddress: ip, riskScore,
    });

    // Issue a short-lived face-verified token (used to authorize vote casting)
    const faceToken = jwt.sign(
      { id: userId, faceVerified: true },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    return sendSuccess(res, 200, 'Face verification successful.', {
      faceToken,
      distance,
      similarity,
      riskScore,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Enroll Face ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/enroll-face
 * Body: faceDescriptor (number[128])
 * Auth: required
 */
const enrollFace = async (req, res, next) => {
  try {
    const { faceDescriptor } = req.body;
    const userId = req.userId;

    if (!validateDescriptor(faceDescriptor)) {
      return sendError(res, 422, 'Invalid face descriptor. Expected 128-element number array.');
    }

    await User.findByIdAndUpdate(userId, { faceEmbedding: faceDescriptor });
    await AuditLog.create({ userId, action: 'FACE_ENROLLED', ipAddress: getIp(req) });

    return sendSuccess(res, 200, 'Face enrolled successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/refresh-token
 * Body: refreshToken
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return sendError(res, 400, 'Refresh token required.');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return sendError(res, 401, 'Invalid or expired refresh token.');
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return sendError(res, 401, 'Refresh token reuse detected or user not found.');
    }

    const newAccessToken = signAccessToken(user._id, user.role);
    const newRefreshToken = signRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return sendSuccess(res, 200, 'Token refreshed.', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/logout
 * Auth: required
 */
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, { refreshToken: null });
    await AuditLog.create({ userId: req.userId, action: 'LOGOUT', ipAddress: getIp(req) });
    return sendSuccess(res, 200, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    return sendSuccess(res, 200, 'Profile retrieved.', user);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, verifyOtp, login, faceVerify, enrollFace, refreshToken, logout, getProfile };
