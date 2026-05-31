const Mood = require('../models/Mood');

/**
 * @desc    Log a new mood entry
 * @route   POST /api/mood
 * @access  Private
 */
const logMood = async (req, res, next) => {
  try {
    const { mood } = req.body;

    if (!mood) {
      return res.status(400).json({ message: 'Please provide a mood' });
    }

    const trimmedMood = mood.toLowerCase().trim();
    const allowedMoods = ['happy', 'sad', 'relaxed', 'excited', 'bored', 'romantic', 'stressed', 'adventurous'];

    if (!allowedMoods.includes(trimmedMood)) {
      return res.status(400).json({
        message: 'Invalid mood. Must be one of: happy, sad, relaxed, excited, bored, romantic, stressed, adventurous',
      });
    }

    const moodEntry = await Mood.create({
      user: req.user._id,
      mood: trimmedMood,
    });

    res.status(201).json(moodEntry);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get mood log history
 * @route   GET /api/mood/history
 * @access  Private
 */
const getMoodHistory = async (req, res, next) => {
  try {
    const history = await Mood.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get latest logged mood
 * @route   GET /api/mood/latest
 * @access  Private
 */
const getLatestMood = async (req, res, next) => {
  try {
    const latest = await Mood.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (!latest) {
      return res.status(200).json(null); // Return null if no mood history
    }
    res.status(200).json(latest);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logMood,
  getMoodHistory,
  getLatestMood,
};
