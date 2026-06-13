const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'movieId is required'],
    },
    rating: {
      type: Number,
      required: [true, 'rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating must be at most 10'],
    },
    liked: {
      type: Boolean,
      default: false,
    },
    disliked: {
      type: Boolean,
      default: false,
    },
    feedbackText: {
      type: String,
      trim: true,
      maxlength: [1000, 'Feedback must not exceed 1000 characters'],
    },
  },
  { timestamps: true }
);

// One rating per user per movie
ratingSchema.index({ userId: 1, movieId: 1 }, { unique: true });

// Fast lookups by movie and by user
ratingSchema.index({ movieId: 1 });
ratingSchema.index({ userId: 1 });

// Pre-save guard: liked and disliked cannot both be true
ratingSchema.pre('save', function (next) {
  if (this.liked && this.disliked) {
    return next(new Error('A rating cannot be both liked and disliked'));
  }
  next();
});

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;
