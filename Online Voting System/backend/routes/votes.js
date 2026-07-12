const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { castVote, verifyVote, getResults, checkVoteStatus } = require('../controllers/voteController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { voteLimiter } = require('../middleware/rateLimiter');
const { detectFraud } = require('../middleware/fraudDetection');
const validate = require('../middleware/validate');

const castVoteRules = [
  body('electionId').notEmpty().isMongoId().withMessage('Valid electionId required'),
  body('candidateId').notEmpty().isMongoId().withMessage('Valid candidateId required'),
  body('deviceFingerprint').optional().isString(),
  body('pageLoadTime').optional().isISO8601(),
];

// Cast vote (voter only) — fraud detection runs before controller
router.post(
  '/cast',
  authenticate,
  requireRole('voter'),
  voteLimiter,
  castVoteRules,
  validate,
  detectFraud,
  castVote
);

// Public: verify a vote by block hash
router.get('/verify/:blockHash', verifyVote);

// Results: public if election allows, always available to admin
router.get('/results/:electionId', optionalAuth, getResults);

// Check if authenticated voter has voted in an election
router.get('/status/:electionId', authenticate, checkVoteStatus);

module.exports = router;
