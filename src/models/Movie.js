const mongoose = require('mongoose');
const { GENRES, CONTENT_TYPES, RATINGS } = require('../config/constants');

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    genres: {
      type: [String],
      enum: GENRES,
      default: [],
    },
    contentType: {
      type: String,
      enum: CONTENT_TYPES,
      default: 'movie',
    },
    rating: {
      type: String,
      enum: RATINGS,
    },
    releaseYear: {
      type: Number,
    },
    language: {
      type: String,
      default: 'en',
    },
    posterUrl: {
      type: String,
    },
    trailerUrl: {
      type: String,
    },
    imdbId: {
      type: String,
      unique: true,
      sparse: true,
    },
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    moods: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

movieSchema.index({ title: 'text', description: 'text' });

const Movie = mongoose.model('Movie', movieSchema);
module.exports = Movie;
