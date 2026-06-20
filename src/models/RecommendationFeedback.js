const mongoose = require('mongoose');

const recommendationFeedbackSchema = new mongoose.Schema(
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
    clicked: {
      type: Boolean,
      default: false,
    },
    liked: {
      type: Boolean,
      default: false,
    },
    disliked: {
      type: Boolean,
      default: false,
    },
    markedIrrelevant: {
      type: Boolean,
      default: false,
    },
    irrelevantReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason must not exceed 500 characters'],
    },
    mlScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    recommendationSource: {
      type: String,
      enum: ['mood', 'genre', 'history', 'rating', 'watchlist', 'trending', 'fallback'],
    },
  },
  { timestamps: true }
);

recommendationFeedbackSchema.index({ userId: 1, movieId: 1 }, { unique: true });
recommendationFeedbackSchema.index({ movieId: 1 });
recommendationFeedbackSchema.index({ createdAt: -1 });

recommendationFeedbackSchema.pre('save', function (next) {
  if (this.liked && this.disliked) {
    return next(new Error('A recommendation cannot be both liked and disliked'));
  }
  next();
});

const RecommendationFeedback = mongoose.model(
  'RecommendationFeedback',
  recommendationFeedbackSchema
);
module.exports = RecommendationFeedback;
