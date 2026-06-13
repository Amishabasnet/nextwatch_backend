const mongoose = require('mongoose');
const { MOODS, GENRES } = require('../config/constants');

const moodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mood: {
      type: String,
      enum: MOODS,
      required: [true, 'Mood is required'],
    },
    suggestedGenres: {
      type: [String],
      enum: GENRES,
      default: [],
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true }
);

const Mood = mongoose.model('Mood', moodSchema);
module.exports = Mood;
