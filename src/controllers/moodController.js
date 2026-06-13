const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  saveMood,
  getMoodsByUserId,
  getLatestMoodByUserId,
} = require('../services/moodService');


// @desc    Save a mood selection for the authenticated user
// @route   POST /api/moods
// @access  Private (JWT required)

const createMoodEntry = asyncHandler(async (req, res) => {
  const mood = await saveMood({
    userId: req.user._id,
    mood: req.body.mood,
    selectedAt: req.body.selectedAt,
  });

  res.status(201).json({
    success: true,
    message: 'Mood saved successfully.',
    data: { mood: mood.toSummary() },
  });
});

// @desc    Get full mood history for a user
// @route   GET /api/moods/:userId
// @access  Private (JWT required — own record or admin)
const getUserMoods = asyncHandler(async (req, res, next) => {
  // Users can only read their own history; admins can read any
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to view these mood records.', 403)
    );
  }

  const moods = await getMoodsByUserId(req.params.userId);

  res.status(200).json({
    success: true,
    message: 'Mood history retrieved successfully.',
    data: {
      count: moods.length,
      moods: moods.map((m) => m.toSummary()),
    },
  });
});

// @desc    Get the most recent mood for a user (used by recommendation engine)
// @route   GET /api/moods/:userId/latest
// @access  Private (JWT required — own record or admin)

const getLatestMood = asyncHandler(async (req, res, next) => {
  // Users can only read their own record; admins can read any
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to view these mood records.', 403)
    );
  }

  const mood = await getLatestMoodByUserId(req.params.userId);

  res.status(200).json({
    success: true,
    message: 'Latest mood retrieved successfully.',
    data: { mood: mood.toSummary() },
  });
});

module.exports = { createMoodEntry, getUserMoods, getLatestMood };
