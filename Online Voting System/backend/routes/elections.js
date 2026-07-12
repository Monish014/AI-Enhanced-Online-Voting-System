const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const {
  createElection, getAllElections, getElectionById,
  updateElection, deleteElection,
  getCandidates, addCandidate, updateCandidate, deleteCandidate,
} = require('../controllers/electionController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { generalLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const upload = require('../config/multer');

const electionRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('startTime').isISO8601().withMessage('Valid startTime required'),
  body('endTime').isISO8601().withMessage('Valid endTime required'),
];

const candidateRules = [
  body('name').trim().notEmpty().withMessage('Candidate name is required'),
];

// Public routes
router.get('/', generalLimiter, optionalAuth, getAllElections);
router.get('/:id', generalLimiter, optionalAuth, getElectionById);
router.get('/:id/candidates', generalLimiter, getCandidates);

// Admin-only routes
router.post('/', authenticate, requireRole('admin'), electionRules, validate, createElection);
router.put('/:id', authenticate, requireRole('admin'), updateElection);
router.delete('/:id', authenticate, requireRole('admin'), deleteElection);

router.get('/:id/candidates', getCandidates);
router.post(
  '/:id/candidates',
  authenticate,
  requireRole('admin'),
  upload.single('candidateImage'),
  candidateRules,
  validate,
  addCandidate
);
router.put(
  '/:id/candidates/:candidateId',
  authenticate,
  requireRole('admin'),
  upload.single('candidateImage'),
  updateCandidate
);
router.delete(
  '/:id/candidates/:candidateId',
  authenticate,
  requireRole('admin'),
  deleteCandidate
);

module.exports = router;
