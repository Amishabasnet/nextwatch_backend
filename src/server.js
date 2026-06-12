const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Load env vars before anything else
dotenv.config();

const connectDB = require('./config/db');
const corsOptions = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes       = require('./routes/authRoutes');
const movieRoutes      = require('./routes/movieRoutes');
const userRoutes       = require('./routes/userRoutes');
const reviewRoutes     = require('./routes/reviewRoutes');
const consentRoutes    = require('./routes/consentRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const moodRoutes       = require('./routes/moodRoutes');
const watchlistRoutes  = require('./routes/watchlistRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// Core Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎬 NextWatch API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes  (flat /api/* as specified per feature)
app.use('/api/auth',        authRoutes);
app.use('/api/consent',     consentRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/moods',       moodRoutes);
app.use('/api/movies',      movieRoutes);
app.use('/api/watchlist',   watchlistRoutes);

// Versioned Routes  /api/v1/*
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`,        authRoutes);
app.use(`${API_PREFIX}/movies`,      movieRoutes);
app.use(`${API_PREFIX}/users`,       userRoutes);
app.use(`${API_PREFIX}/reviews`,     reviewRoutes);
app.use(`${API_PREFIX}/consent`,     consentRoutes);
app.use(`${API_PREFIX}/preferences`, preferenceRoutes);
app.use(`${API_PREFIX}/moods`,       moodRoutes);
app.use(`${API_PREFIX}/watchlist`,   watchlistRoutes);

// 404 Handler
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.originalUrl} on this server`,
  });
});

// Global Error Handler (must be last)
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `NextWatch API running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
