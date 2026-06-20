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
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes must not exceed 300 characters'],
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

watchlistSchema.index({ user: 1, movie: 1 }, { unique: true });

watchlistSchema.index({ user: 1, priority: -1, createdAt: -1 });

const Watchlist = mongoose.model('Watchlist', watchlistSchema);
module.exports = Watchlist;
