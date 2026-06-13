const { Mood } = require('../models/Mood');
const AppError = require('../utils/AppError');

// Save a new mood entry for a user
const saveMood = async ({ userId, mood, selectedAt }) => {
  const entry = await Mood.create({
    userId,
    mood,

    // Use the submitted date when provided; otherwise, the current date is used
    ...(selectedAt !== undefined && { selectedAt }),
  });

  return entry;
};

// Get the complete mood history of a user
const getMoodsByUserId = async (userId) => {
  // Show the most recently selected moods first
  const moods = await Mood.find({ userId })
    .sort({ selectedAt: -1 })
    .populate('userId', 'fullName email');

  // Return an error when the user has not recorded any moods
  if (!moods.length) {
    throw new AppError('No mood records found for this user.', 404);
  }

  return moods;
};

// Get the most recently selected mood of a user
const getLatestMoodByUserId = async (userId) => {
  // This mood can be used by the recommendation system
  const latest = await Mood.findOne({ userId })
    .sort({ selectedAt: -1 })
    .populate('userId', 'fullName email');

  // Return an error when the user has no saved mood records
  if (!latest) {
    throw new AppError('No mood records found for this user.', 404);
  }

  return latest;
};

module.exports = {
  saveMood,
  getMoodsByUserId,
  getLatestMoodByUserId,
};