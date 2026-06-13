const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Load the environment variables before setting up the application
dotenv.config();

const connectDB = require('./config/db');
const corsOptions = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');

// Import the routes used by the application
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const userRoutes = require('./routes/userRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const consentRoutes = require('./routes/consentRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const moodRoutes = require('./routes/moodRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');

// Connect the application to the MongoDB database
connectDB();

const app = express();

// Set up the main middleware used by the server
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Check whether the API server is running properly
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎬 NextWatch API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Main API routes without version numbers
app.use('/api/auth', authRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/watchlist', watchlistRoutes);

// Versioned API routes
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/movies`, movieRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/consent`, consentRoutes);
app.use(`${API_PREFIX}/preferences`, preferenceRoutes);
app.use(`${API_PREFIX}/moods`, moodRoutes);
app.use(`${API_PREFIX}/watchlist`, watchlistRoutes);

// Return an error when the requested route does not exist
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.method} ${req.originalUrl} on this server`,
  });
});

// Handle application errors after all routes have been checked
app.use(errorHandler);

// Use the port from the environment file or port 5000 by default
const PORT = process.env.PORT || 5000;

// Start the NextWatch server
const server = app.listen(PORT, () => {
  console.log(
    `NextWatch API running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});

// Close the server when a Promise rejection is not handled
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);

  server.close(() => process.exit(1));
});

// Stop the application when an unexpected error occurs
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;