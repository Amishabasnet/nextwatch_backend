const mongoose = require('mongoose');

// Shared constants
// These are exported as properties on the model so existing consumers that do
//   const Movie = require('../models/Movie')
// continue to work, while new consumers can destructure:
//   const { SUPPORTED_GENRES } = require('../models/Movie')

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

// Mirrors VALID_MOODS in models/Mood.js — keep in sync.
// These tags let the recommendation engine match movies to a user's current mood.
const MOVIE_MOOD_TAGS = [
  'Happy',
  'Sad',
  'Relaxed',
  'Excited',
  'Bored',
  'Romantic',
  'Stressed',
  'Angry',
];

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

/**
 * Maps full English language names (case-insensitive) to BCP-47 codes.
 * Used by the search endpoint so clients can pass "English" instead of "en".
 * Keys are lowercase; values match SUPPORTED_LANGUAGES exactly.
 */
const LANGUAGE_NAME_TO_CODE = {
  english:    'en',
  spanish:    'es',
  french:     'fr',
  german:     'de',
  hindi:      'hi',
  japanese:   'ja',
  korean:     'ko',
  portuguese: 'pt',
  chinese:    'zh',
  arabic:     'ar',
};

const MOVIE_STATUS = ['released', 'upcoming', 'in_production'];

// Schema

const MovieSchema = new mongoose.Schema(
  {
    // Core identity
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // Classification
    genres: {
      type: [String],
      required: [true, 'At least one genre is required'],
      validate: {
        validator(genres) {
          return (
            genres.length > 0 &&
            genres.every((g) => SUPPORTED_GENRES.includes(g))
          );
        },
        message: `genres must be a non-empty array of: ${SUPPORTED_GENRES.join(', ')}`,
      },
    },

    releaseYear: {
      type: Number,
      min: [1888, 'Release year cannot be before 1888 (year of first film)'],
      max: [
        new Date().getFullYear() + 5,
        'Release year is too far in the future',
      ],
    },

    duration: {
      type: Number, // minutes
      min: [1, 'Duration must be at least 1 minute'],
    },

    status: {
      type: String,
      enum: {
        values: MOVIE_STATUS,
        message: `status must be one of: ${MOVIE_STATUS.join(', ')}`,
      },
      default: 'released',
    },

    language: {
      type: String,
      enum: {
        values: SUPPORTED_LANGUAGES,
        message: `"{VALUE}" is not a supported language code`,
      },
      default: 'en',
    },

    // Ratings (managed by Review system — not writable via API)
    rating: {
      average: { type: Number, default: 0, min: 0, max: 10 },
      count: { type: Number, default: 0 },
    },

    // Crew & cast
    director: {
      type: String,
      trim: true,
      default: '',
    },

    cast: [
      {
        name: {
          type: String,
          required: [true, 'Cast member name is required'],
          trim: true,
        },
        character: { type: String, trim: true, default: '' },
        profileUrl: { type: String, default: '' },
      },
    ],

    // Media assets
    posterUrl: { type: String, default: '' },
    trailerUrl: { type: String, default: '' },
    backdropUrl: { type: String, default: '' },

    // Discovery & recommendation
    /**
     * moodTags — links a movie to one or more user moods for the
     * recommendation engine.  Values must come from MOVIE_MOOD_TAGS.
     * Example: a feel-good comedy might carry ['Happy', 'Relaxed'].
     */
    moodTags: {
      type: [String],
      enum: {
        values: MOVIE_MOOD_TAGS,
        message: `"{VALUE}" is not a valid mood tag`,
      },
      default: [],
      validate: {
        validator(tags) {
          return new Set(tags).size === tags.length;
        },
        message: 'moodTags must not contain duplicates',
      },
    },

    /**
     * keywords — free-form search terms boosted by the text index.
     * Useful for thematic search ("heist", "space opera", etc.).
     */
    keywords: {
      type: [String],
      default: [],
    },

    // External integration
    tmdbId: {
      type: Number,
      unique: true,
      sparse: true, // allows multiple docs without this field
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual

MovieSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'movie',
  justOne: false,
});

// Indexes

// Full-text search across title, description, and keywords
MovieSchema.index({ title: 'text', description: 'text', keywords: 'text' });

// Most common list query: filter by genre, sort by rating
MovieSchema.index({ genres: 1, 'rating.average': -1 });

// Recommendation engine: fast lookup by mood tag
MovieSchema.index({ moodTags: 1 });

// Instance methods

/**
 * Compact shape for list/search responses.
 * Omits heavy text fields (description, cast, keywords) to keep payloads lean.
 */
MovieSchema.methods.toSummary = function () {
  return {
    _id: this._id,
    title: this.title,
    genres: this.genres,
    releaseYear: this.releaseYear,
    duration: this.duration,
    rating: this.rating,
    director: this.director,
    language: this.language,
    posterUrl: this.posterUrl,
    moodTags: this.moodTags,
    status: this.status,
    createdAt: this.createdAt,
  };
};

/**
 * Full shape for detail responses.
 * Includes all fields; reviews are populated separately by the controller.
 */
MovieSchema.methods.toDetail = function () {
  return {
    _id: this._id,
    title: this.title,
    description: this.description,
    genres: this.genres,
    releaseYear: this.releaseYear,
    duration: this.duration,
    rating: this.rating,
    cast: this.cast,
    director: this.director,
    language: this.language,
    posterUrl: this.posterUrl,
    trailerUrl: this.trailerUrl,
    backdropUrl: this.backdropUrl,
    moodTags: this.moodTags,
    keywords: this.keywords,
    status: this.status,
    tmdbId: this.tmdbId,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Export

const Movie = mongoose.model('Movie', MovieSchema);

/**
 * Primary export is the model itself so existing consumers keep working:
 *   const Movie = require('../models/Movie')
 *
 * Constants are attached as properties for new consumers:
 *   const { SUPPORTED_GENRES } = require('../models/Movie')
 */
module.exports = Movie;
module.exports.SUPPORTED_GENRES      = SUPPORTED_GENRES;
module.exports.SUPPORTED_LANGUAGES   = SUPPORTED_LANGUAGES;
module.exports.LANGUAGE_NAME_TO_CODE = LANGUAGE_NAME_TO_CODE;
module.exports.MOVIE_MOOD_TAGS       = MOVIE_MOOD_TAGS;
module.exports.MOVIE_STATUS          = MOVIE_STATUS;
