const { Mood } = require('../models/Mood');
const AppError = require('../utils/AppError');

// saveMood
/**
 * Persists a new mood entry for a user.
 *
 * @param {object} params
 * @param {ObjectId} params.userId    - Authenticated user's _id
 * @param {string}   params.mood      - One of the VALID_MOODS values
 * @param {Date}     [params.selectedAt] - Client-supplied timestamp; falls back to server time
 * @returns {Promise<MoodDocument>}
 */
const saveMood = async ({ userId, mood, selectedAt }) => {
  const entry = await Mood.create({
    userId,
    mood,
    // Only set selectedAt when the client provided it; otherwise the schema
    // default (Date.now) applies so the field is never undefined.
    ...(selectedAt !== undefined && { selectedAt }),
  });

  return entry;
};

// getMoodsByUserId
/**
 * Retrieves the full mood history for a user, newest first.
 * Throws 404 when no records exist yet.
 *
 * @param {string} userId
 * @returns {Promise<MoodDocument[]>}
 */
const getMoodsByUserId = async (userId) => {
  const moods = await Mood.find({ userId })
    .sort({ selectedAt: -1 })
    .populate('userId', 'fullName email');

  if (!moods.length) {
    throw new AppError(
      'No mood records found for this user.',
      404
    );
  }

  return moods;
};

// getLatestMoodByUserId
/**
 * Retrieves the single most-recent mood entry for a user.
 * This is the value consumed by the recommendation engine.
 * Throws 404 when no records exist yet.
 *
 * @param {string} userId
 * @returns {Promise<MoodDocument>}
 */
const getLatestMoodByUserId = async (userId) => {
  const latest = await Mood.findOne({ userId })
    .sort({ selectedAt: -1 })
    .populate('userId', 'fullName email');

  if (!latest) {
    throw new AppError(
      'No mood records found for this user.',
      404
    );
  }

  return latest;
};

module.exports = { saveMood, getMoodsByUserId, getLatestMoodByUserId };
