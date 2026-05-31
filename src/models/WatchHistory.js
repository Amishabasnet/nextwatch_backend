const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema(
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
    watchedDate: {
      type: Date,
      default: Date.now,
    },
    watchDuration: {
      type: Number,
      required: [true, 'Please specify the watched duration in seconds'],
      min: [0, 'Duration cannot be negative'],
    },
    completedStatus: {
      type: Boolean,
      required: true,
      default: false,
    },
    deviceType: {
      type: String,
      required: [true, 'Please specify the device type used'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);

module.exports = WatchHistory;
