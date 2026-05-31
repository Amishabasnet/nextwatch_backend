const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only track when added
  }
);

// Ensure a user can only have a movie in their watchlist once
watchlistSchema.index({ user: 1, movie: 1 }, { unique: true });

const Watchlist = mongoose.model('Watchlist', watchlistSchema);

module.exports = Watchlist;
