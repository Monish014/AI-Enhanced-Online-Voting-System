const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { askChatbot, getChatHistory } = require('../controllers/chatbotController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

// Ask — optionalAuth so anonymous users can also query
router.post(
  '/ask',
  generalLimiter,
  optionalAuth,
  [body('question').trim().notEmpty().withMessage('Question is required').isLength({ max: 1000 })],
  validate,
  askChatbot
);

// History — requires auth
router.get('/history', authenticate, getChatHistory);

module.exports = router;
