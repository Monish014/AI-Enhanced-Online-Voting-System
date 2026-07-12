const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  register, verifyOtp, login, faceVerify,
  enrollFace, refreshToken, logout, getProfile,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, faceVerifyLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const upload = require('../config/multer');

// Validation rules
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/(?=.*[A-Z])(?=.*[0-9])/).withMessage('Password must contain a number and uppercase letter'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const otpRules = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits').isNumeric(),
];

// Routes
router.post(
  '/register',
  authLimiter,
  upload.fields([{ name: 'faceImage', maxCount: 1 }, { name: 'documentImage', maxCount: 1 }]),
  registerRules,
  validate,
  register
);

router.post('/verify-otp', authLimiter, otpRules, validate, verifyOtp);

router.post('/login', authLimiter, loginRules, validate, login);

router.post(
  '/face-verify',
  authenticate,
  faceVerifyLimiter,
  [
    body('faceDescriptor').isArray({ min: 128, max: 128 }).withMessage('faceDescriptor must be 128-element array'),
    body('livenessPass').isBoolean().withMessage('livenessPass must be boolean'),
  ],
  validate,
  faceVerify
);

router.post(
  '/enroll-face',
  authenticate,
  [body('faceDescriptor').isArray({ min: 128, max: 128 }).withMessage('faceDescriptor must be 128-element array')],
  validate,
  enrollFace
);

router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty().withMessage('Refresh token required')],
  validate,
  refreshToken
);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getProfile);

module.exports = router;
