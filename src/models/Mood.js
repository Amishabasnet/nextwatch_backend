const mongoose = require('mongoose');

const allowedMoods = ['happy', 'sad', 'relaxed', 'excited', 'bored', 'romantic', 'stressed', 'adventurous'];

const moodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mood: {
      type: String,
      required: [true, 'Please provide a mood'],
      enum: {
        values: allowedMoods,
        message: 'Mood must be one of: happy, sad, relaxed, excited, bored, romantic, stressed, adventurous',
      },
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only track when logged
  }
);

const Mood = mongoose.model('Mood', moodSchema);

module.exports = Mood;
