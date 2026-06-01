const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a movie title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a movie description'],
    },
    genre: {
      type: [String],
      required: [true, 'Please add at least one genre'],
    },
    language: {
      type: String,
      required: [true, 'Please specify the language'],
      trim: true,
    },
    releaseYear: {
      type: Number,
      required: [true, 'Please add the release year'],
    },
    actors: {
      type: [String],
      required: [true, 'Please add at least one actor'],
    },
    director: {
      type: String,
      required: [true, 'Please specify the director'],
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [10, 'Rating cannot be more than 10'],
    },
    tags: {
      type: [String],
      default: [],
    },
    moodCategory: {
      type: String,
      trim: true,
      lowercase: true,
    },
    posterUrl: {
      type: String,
      default: '',
    },
    trailerUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
