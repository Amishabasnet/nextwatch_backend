const mongoose = require('mongoose');

const WatchlistSchema = new mongoose.Schema(
  {
    // User who saved the movie
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },

    // Movie added to the user's watchlist
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'movieId is required'],
    },

    // Date and time when the movie was saved
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Automatically add createdAt and updatedAt
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent the same user from saving the same movie more than once
WatchlistSchema.index(
  {
    userId: 1,
    movieId: 1,
  },
  {
    unique: true,
  }
);

// Help retrieve a user's watchlist with the newest movies first
WatchlistSchema.index({
  userId: 1,
  savedAt: -1,
});

// Return a clean watchlist response
WatchlistSchema.methods.toSummary = function () {
  // Check whether movieId has been replaced with the full movie document
  const isPopulated =
    this.movieId !== null &&
    !(this.movieId instanceof mongoose.Types.ObjectId);

  return {
    _id: this._id,
    savedAt: this.savedAt,
    createdAt: this.createdAt,

    // Return full movie details when populated; otherwise return the movie ID
    ...(isPopulated
      ? {
          movie:
            this.movieId?.toSummary?.() ??
            this.movieId,
        }
      : {
          movieId: this.movieId,
        }),
  };
};

const Watchlist = mongoose.model(
  'Watchlist',
  WatchlistSchema
);

module.exports = {
  Watchlist,
};