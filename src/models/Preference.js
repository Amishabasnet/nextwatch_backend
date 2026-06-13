const mongoose = require('mongoose');

// These are the movie genres currently available in NextWatch.
// This list can also be used in routes and validation.
const SUPPORTED_GENRES = [
  'Action',
  'Comedy',
  'Romance',
  'Horror',
  'Thriller',
  'Sci-Fi',
  'Drama',
  'Animation',
  'Documentary',
  'Mystery',
];

// Languages currently supported by NextWatch.
// More languages can be added here in the future.
const SUPPORTED_LANGUAGES = [
  'en', // English
  'es', // Spanish
  'fr', // French
  'de', // German
  'hi', // Hindi
  'ja', // Japanese
  'ko', // Korean
  'pt', // Portuguese
  'zh', // Chinese
  'ar', // Arabic
];

const PreferenceSchema = new mongoose.Schema(
  {
    // Connects the preferences to a specific user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      unique: true, // Each user can only have one preference record
      index: true,
    },

    // Genres selected as favourites by the user
    favoriteGenres: {
      type: [String],
      enum: {
        values: SUPPORTED_GENRES,
        message: '"{VALUE}" is not a supported genre',
      },
      default: [],
      validate: {
        validator(genres) {
          // Prevent the same genre from being selected more than once
          return new Set(genres).size === genres.length;
        },
        message: 'favoriteGenres must not contain duplicate values',
      },
    },

    // Genres the user does not want to see
    dislikedGenres: {
      type: [String],
      enum: {
        values: SUPPORTED_GENRES,
        message: '"{VALUE}" is not a supported genre',
      },
      default: [],
      validate: {
        validator(genres) {
          // Make sure the disliked genre list has no duplicates
          return new Set(genres).size === genres.length;
        },
        message: 'dislikedGenres must not contain duplicate values',
      },
    },

    // The user's preferred movie language
    preferredLanguage: {
      type: String,
      enum: {
        values: SUPPORTED_LANGUAGES,
        message: '"{VALUE}" is not a supported language code',
      },
      default: 'en',
    },

    // Stores the date when the preferences were last updated
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Run this validation before saving the user's preferences
PreferenceSchema.pre('save', function (next) {
  // A genre should not appear in both favourite and disliked lists
  const overlap = this.favoriteGenres.filter((genre) =>
    this.dislikedGenres.includes(genre)
  );

  if (overlap.length > 0) {
    return next(
      new Error(
        `The following genres appear in both favoriteGenres and dislikedGenres: ${overlap.join(', ')}`
      )
    );
  }

  // Update the date whenever the preference record is saved
  this.updatedAt = new Date();
  next();
});

// Returns only the preference information needed by the frontend
PreferenceSchema.methods.toSummary = function () {
  return {
    _id: this._id,
    userId: this.userId,
    favoriteGenres: this.favoriteGenres,
    dislikedGenres: this.dislikedGenres,
    preferredLanguage: this.preferredLanguage,
    updatedAt: this.updatedAt,
    createdAt: this.createdAt,
  };
};

const Preference = mongoose.model('Preference', PreferenceSchema);

module.exports = {
  Preference,
  SUPPORTED_GENRES,
  SUPPORTED_LANGUAGES,
};