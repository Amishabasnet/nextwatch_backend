const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');
const moodRoutes = require('./routes/moodRoutes');
const movieRoutes = require('./routes/movieRoutes');
const featureRoutes = require('./routes/featureRoutes');
const historyRoutes = require('./routes/historyRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/recommendations', recommendationRoutes);


// Health check
app.get('/', (req, res) => {
  res.json({ message: 'NextWatch API is running' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
