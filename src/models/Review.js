const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    // Movie that the review belongs to
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },

    // User who submitted the review
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Rating given by the user
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating cannot exceed 10'],
    },

    // Written feedback about the movie
    content: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
      default: '',
    },

    // Users who liked this review
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Shows whether the review contains spoilers
    spoiler: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically add createdAt and updatedAt
    timestamps: true,
  }
);

// Allow each user to review a movie only once
ReviewSchema.index(
  {
    movie: 1,
    user: 1,
  },
  {
    unique: true,
  }
);

// Calculate and update the movie's average rating
ReviewSchema.statics.calcAverageRating = async function (movieId) {
  const stats = await this.aggregate([
    {
      $match: {
        movie: movieId,
      },
    },
    {
      $group: {
        _id: '$movie',
        avgRating: {
          $avg: '$rating',
        },
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  // Update the average and total number of ratings when reviews exist
  if (stats.length > 0) {
    await mongoose.model('Movie').findByIdAndUpdate(movieId, {
      'rating.average':
        Math.round(stats[0].avgRating * 10) / 10,
      'rating.count': stats[0].count,
    });
  } else {
    // Reset the rating when the movie has no reviews
    await mongoose.model('Movie').findByIdAndUpdate(movieId, {
      'rating.average': 0,
      'rating.count': 0,
    });
  }
};

// Recalculate the movie rating after a review is saved
ReviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.movie);
});

// Recalculate the movie rating after a review is removed
ReviewSchema.post('remove', function () {
  this.constructor.calcAverageRating(this.movie);
});

module.exports = mongoose.model('Review', ReviewSchema);