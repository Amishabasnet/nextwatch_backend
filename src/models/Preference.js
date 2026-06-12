const mongoose = require('mongoose');

/**
 * Canonical list of genres supported by NextWatch.
 * Shared with routes/validation so there is a single source of truth.
 */
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

/**
 * Supported BCP-47 language codes.
 * Extend this list as NextWatch adds more content libraries.
 */
const SUPPORTED_LANGUAGES = [
  'en',  // English
  'es',  // Spanish
  'fr',  // French
  'de',  // German
  'hi',  // Hindi
  'ja',  // Japanese
  'ko',  // Korean
  'pt',  // Portuguese
  'zh',  // Chinese
  'ar',  // Arabic
];

const PreferenceSchema = new mongoose.Schema(
  {
    // Identity 
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      unique: true,   // one preference record per user
      index: true,
    },

    // Genre preferences 
    favoriteGenres: {
      type: [String],
      enum: {
        values: SUPPORTED_GENRES,
        message: '"{VALUE}" is not a supported genre',
      },
      default: [],
      validate: {
        validator(genres) {
          // No duplicates
          return new Set(genres).size === genres.length;
        },
        message: 'favoriteGenres must not contain duplicate values',
      },
    },

    dislikedGenres: {
      type: [String],
      enum: {
        values: SUPPORTED_GENRES,
        message: '"{VALUE}" is not a supported genre',
      },
      default: [],
      validate: {
        validator(genres) {
          return new Set(genres).size === genres.length;
        },
        message: 'dislikedGenres must not contain duplicate values',
      },
    },

    // Language preference 
    preferredLanguage: {
      type: String,
      enum: {
        values: SUPPORTED_LANGUAGES,
        message: '"{VALUE}" is not a supported language code',
      },
      default: 'en',
    },

    // Audit timestamp 
    /**
     * updatedAt is kept as an explicit field (not relying solely on
     * Mongoose timestamps) so it is always present at the top level and
     * easy for clients to read without parsing metadata.
     */
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,   // also adds createdAt / updatedAt to the document
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook 
PreferenceSchema.pre('save', function (next) {
  // Ensure a genre cannot be both liked and disliked simultaneously
  const overlap = this.favoriteGenres.filter((g) =>
    this.dislikedGenres.includes(g)
  );
  if (overlap.length > 0) {
    return next(
      new Error(
        `The following genres appear in both favoriteGenres and dislikedGenres: ${overlap.join(', ')}`
      )
    );
  }

  // Keep explicit updatedAt in sync
  this.updatedAt = new Date();
  next();
});

// Instance method 

/**
 * Clean response shape used by all three endpoints.
 */
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

module.exports = { Preference, SUPPORTED_GENRES, SUPPORTED_LANGUAGES };
