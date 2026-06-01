const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: [true, 'Please provide feedback type'],
      enum: {
        values: ['recommendation_like', 'recommendation_dislike', 'general'],
        message: 'Feedback type must be one of: recommendation_like, recommendation_dislike, general',
      },
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: function () {
        return this.type === 'recommendation_like' || this.type === 'recommendation_dislike';
      },
    },
    comment: {
      type: String,
      required: function () {
        return this.type === 'general';
      },
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
