const mongoose = require('mongoose');

/**
 * Canonical mood options for NextWatch.
 * Exported so routes/validation share the same single source of truth.
 */
const VALID_MOODS = [
  'Happy',
  'Sad',
  'Relaxed',
  'Excited',
  'Bored',
  'Romantic',
  'Stressed',
  'Angry',
];

const MoodSchema = new mongoose.Schema(
  {
    // Identity 
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },

    // Mood selection 
    mood: {
      type: String,
      required: [true, 'mood is required'],
      enum: {
        values: VALID_MOODS,
        message: `"{VALUE}" is not a valid mood. Allowed: ${VALID_MOODS.join(', ')}`,
      },
    },

    // Timestamp of the selection 
    /**
     * Stored separately from Mongoose's createdAt so clients can backfill
     * moods from a client-side timestamp when offline support is needed.
     * Defaults to the server's current time when not supplied.
     */
    selectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,           // adds createdAt / updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes 

/**
 * Compound index for efficient per-user mood history queries sorted by time.
 * Also enables O(log n) retrieval of the latest mood via findOne + sort.
 */
MoodSchema.index({ userId: 1, selectedAt: -1 });

// Instance method 

/**
 * Clean, consistent response shape used by all three endpoints.
 */
MoodSchema.methods.toSummary = function () {
  return {
    _id: this._id,
    userId: this.userId,
    mood: this.mood,
    selectedAt: this.selectedAt,
    createdAt: this.createdAt,
  };
};

const Mood = mongoose.model('Mood', MoodSchema);

module.exports = { Mood, VALID_MOODS };
