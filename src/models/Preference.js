const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    genrePreferences: {
      type: [String],
      default: [],
    },
    favoriteActors: {
      type: [String],
      default: [],
    },
    dislikedGenres: {
      type: [String],
      default: [],
    },
    preferredLanguage: {
      type: String,
      default: '',
    },
    ageViewingPreference: {
      type: String,
      default: 'All', // e.g. G, PG, PG-13, R, NC-17, All
    },
  },
  {
    timestamps: true,
  }
);

const Preference = mongoose.model('Preference', preferenceSchema);

module.exports = Preference;
