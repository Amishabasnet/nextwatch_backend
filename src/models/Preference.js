const mongoose = require('mongoose');
const { GENRES, CONTENT_TYPES, RATINGS } = require('../config/constants');

const preferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    favoriteGenres: {
      type: [String],
      enum: GENRES,
      default: [],
    },
    preferredContentTypes: {
      type: [String],
      enum: CONTENT_TYPES,
      default: [],
    },
    preferredRatings: {
      type: [String],
      enum: RATINGS,
      default: [],
    },
    preferredLanguages: {
      type: [String],
      default: ['en'],
    },
    minReleaseYear: {
      type: Number,
      default: 1990,
    },
    maxReleaseYear: {
      type: Number,
      default: new Date().getFullYear(),
    },
    excludedGenres: {
      type: [String],
      enum: GENRES,
      default: [],
    },
  },
  { timestamps: true }
);

const Preference = mongoose.model('Preference', preferenceSchema);
module.exports = Preference;
