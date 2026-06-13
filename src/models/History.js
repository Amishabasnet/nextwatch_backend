const mongoose = require('mongoose');

// Types of movie interactions recorded by NextWatch
// These actions can later be used by the recommendation system
const ACTION_TYPES = ['viewed', 'clicked', 'watched', 'rated'];

const HistorySchema = new mongoose.Schema(
  {
    // User who performed the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },

    // Movie connected to the user's action
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'movieId is required'],
    },

    // Type of interaction the user had with the movie
    actionType: {
      type: String,
      required: [true, 'actionType is required'],
      enum: {
        values: ACTION_TYPES,
        message: `actionType must be one of: ${ACTION_TYPES.join(', ')}`,
      },
    },

    // Date and time when the interaction happened
    // A custom time can be provided, otherwise the current time is used
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Store any additional information related to the action
    // For example, this may include watch progress, rating or source
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // Automatically add createdAt and updatedAt
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Help retrieve a user's activity with the newest actions first
HistorySchema.index({
  userId: 1,
  timestamp: -1,
});

// Help filter a user's history by action type
HistorySchema.index({
  userId: 1,
  actionType: 1,
  timestamp: -1,
});

// Help find users who interacted with a particular movie
HistorySchema.index({
  movieId: 1,
  actionType: 1,
  timestamp: -1,
});

// Help find recent actions across all users
HistorySchema.index({
  actionType: 1,
  timestamp: -1,
});

// Return a clean version of the history entry
HistorySchema.methods.toSummary = function () {
  // Check whether movieId contains the full movie document
  const isPopulated =
    this.movieId !== null &&
    !(this.movieId instanceof mongoose.Types.ObjectId);

  return {
    _id: this._id,
    actionType: this.actionType,
    timestamp: this.timestamp,
    metadata: this.metadata,
    createdAt: this.createdAt,

    // Return movie details when populated; otherwise return only its ID
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

const History = mongoose.model('History', HistorySchema);

module.exports = {
  History,
  ACTION_TYPES,
};