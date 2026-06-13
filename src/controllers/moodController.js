const Mood = require('../models/Mood');

// Save the user's current mood
const logMood = async (req, res, next) => {
  try {
    const { mood } = req.body;

    // Make sure a mood was included in the request
    if (!mood) {
      return res.status(400).json({
        message: 'Please provide a mood',
      });
    }

    // Convert the mood to lowercase and remove extra spaces
    const trimmedMood = mood.toLowerCase().trim();

    // List of moods supported by NextWatch
    const allowedMoods = [
      'happy',
      'sad',
      'relaxed',
      'excited',
      'bored',
      'romantic',
      'stressed',
      'adventurous',
    ];

    // Check whether the submitted mood is supported
    if (!allowedMoods.includes(trimmedMood)) {
      return res.status(400).json({
        message:
          'Invalid mood. Must be one of: happy, sad, relaxed, excited, bored, romantic, stressed, adventurous',
      });
    }

    // Create a new mood entry for the logged-in user
    const moodEntry = await Mood.create({
      user: req.user._id,
      mood: trimmedMood,
    });

    res.status(201).json(moodEntry);
  } catch (error) {
    next(error);
  }
};

// Get all moods previously logged by the user
const getMoodHistory = async (req, res, next) => {
  try {
    // Show the newest mood entries first
    const history = await Mood.find({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

// Get the most recently logged mood
const getLatestMood = async (req, res, next) => {
  try {
    const latest = await Mood.findOne({
      user: req.user._id,
    }).sort({
      createdAt: -1,
    });

    // Return null when the user has not logged any moods yet
    if (!latest) {
      return res.status(200).json(null);
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