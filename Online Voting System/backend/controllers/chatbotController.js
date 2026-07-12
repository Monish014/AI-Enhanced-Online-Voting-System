const axios = require('axios');
const ChatbotQuery = require('../models/ChatbotQuery');
const { sendSuccess, sendError } = require('../utils/response');

// Fallback answers for common intents when NLP service is unavailable
const FALLBACK_ANSWERS = {
  greeting: 'Hello! I\'m the VoteAI assistant. How can I help you today?',
  how_to_vote: 'To cast your vote: 1) Log in with your credentials, 2) Complete face verification, 3) Select your candidate, 4) Confirm your choice. Your vote will be recorded with a unique block hash receipt.',
  check_results: 'Election results are published after the election ends, if the election is set to public results. Visit the Results page to view them.',
  verify_vote: 'To verify your vote, visit the "Verify Vote" page and enter your block hash receipt. This confirms your vote was recorded without revealing your choice.',
  registration: 'To register, click "Register" on the home page. You\'ll need to provide your personal details, upload an ID document, and complete face enrollment.',
  election_dates: 'Please visit the Elections page to see current and upcoming election dates and schedules.',
  default: 'I\'m sorry, I don\'t have a specific answer for that. Please contact support or visit our help centre for more information.',
};

const getFallbackAnswer = (question) => {
  const q = question.toLowerCase();
  if (q.match(/hello|hi|hey|greet/)) return FALLBACK_ANSWERS.greeting;
  if (q.match(/how.*vote|cast.*vote|voting.*process/)) return FALLBACK_ANSWERS.how_to_vote;
  if (q.match(/result|winner|tally/)) return FALLBACK_ANSWERS.check_results;
  if (q.match(/verify|block.*hash|receipt|confirm/)) return FALLBACK_ANSWERS.verify_vote;
  if (q.match(/register|sign.*up|enroll/)) return FALLBACK_ANSWERS.registration;
  if (q.match(/when|date|schedule|time/)) return FALLBACK_ANSWERS.election_dates;
  return FALLBACK_ANSWERS.default;
};

/**
 * POST /api/chatbot/ask
 * Body: question (string)
 * Auth: optional
 */
const askChatbot = async (req, res, next) => {
  try {
    const { question } = req.body;
    const userId = req.userId || null;
    const startTime = Date.now();

    if (!question || question.trim().length === 0) {
      return sendError(res, 400, 'Question cannot be empty.');
    }
    if (question.length > 1000) {
      return sendError(res, 400, 'Question cannot exceed 1000 characters.');
    }

    let answer = null;
    let intent = null;
    let confidence = null;

    // Try forwarding to NLP microservice
    if (process.env.NLP_SERVICE_URL) {
      try {
        const nlpResponse = await axios.post(
          `${process.env.NLP_SERVICE_URL}/predict`,
          { question: question.trim() },
          { timeout: 5000 }
        );
        answer = nlpResponse.data?.answer || null;
        intent = nlpResponse.data?.intent || null;
        confidence = nlpResponse.data?.confidence || null;
      } catch (nlpErr) {
        console.warn('[Chatbot] NLP service unavailable, using fallback:', nlpErr.message);
      }
    }

    // Fallback if NLP service unreachable or returned no answer
    if (!answer) {
      answer = getFallbackAnswer(question);
      intent = 'fallback';
      confidence = null;
    }

    const responseTimeMs = Date.now() - startTime;

    // Log query async (don't block response)
    ChatbotQuery.create({
      userId,
      question: question.trim(),
      answer,
      intent,
      confidence,
      responseTimeMs,
    }).catch((err) => console.error('[Chatbot] Log error:', err.message));

    return sendSuccess(res, 200, 'Answer retrieved.', {
      question: question.trim(),
      answer,
      intent,
      confidence,
      responseTimeMs,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/chatbot/history
 * Auth: required — returns the authenticated user's chat history
 */
const getChatHistory = async (req, res, next) => {
  try {
    const history = await ChatbotQuery.find({ userId: req.userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .select('question answer intent timestamp')
      .lean();
    return sendSuccess(res, 200, 'Chat history retrieved.', history);
  } catch (err) {
    next(err);
  }
};

module.exports = { askChatbot, getChatHistory };
