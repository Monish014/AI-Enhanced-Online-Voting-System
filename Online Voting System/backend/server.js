require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/db');
const { scheduleCronJobs } = require('./config/scheduler');
const errorHandler = require('./middleware/errorHandler');
const { verifyEmailConfig } = require('./services/emailService');

// Route imports
const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/elections');
const voteRoutes = require('./routes/votes');
const fraudRoutes = require('./routes/fraud');
const adminRoutes = require('./routes/admin');
const chatbotRoutes = require('./routes/chatbot');

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app so controllers can emit events
app.set('io', io);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('join-admin', (token) => {
    // In production, verify admin token here before joining room
    socket.join('admin-room');
    console.log(`[Socket] Client ${socket.id} joined admin-room`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AI Voting System API is running', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start cron jobs
scheduleCronJobs();

// Verify email config
verifyEmailConfig();

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌐 API: http://localhost:${PORT}/api/health\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err.message);
  httpServer.close(() => process.exit(1));
});

module.exports = { app, httpServer };
