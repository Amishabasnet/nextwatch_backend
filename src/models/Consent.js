const mongoose = require('mongoose');

/**
 * ConsentItem — one granular data-sharing permission.
 * Each of the five consent categories shares this shape.
 */
const ConsentItemSchema = new mongoose.Schema(
  {
    granted: {
      type: Boolean,
      required: true,
      default: false,
    },
    // ISO timestamp of when this specific item was last toggled
    grantedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false } // embedded sub-docs don't need their own _id
);

const ConsentSchema = new mongoose.Schema(
  {
    // Core required fields 
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      unique: true, // one consent record per user
      index: true,
    },

    /**
     * consentAccepted — true only when ALL five categories are granted.
     * Computed and stored on every save for fast querying.
     */
    consentAccepted: {
      type: Boolean,
      default: false,
    },

    /**
     * consentDate — timestamp of the most recent change to any consent item.
     * Updated automatically in the pre-save hook.
     */
    consentDate: {
      type: Date,
      default: null,
    },

    /**
     * dataUsageDescription — plain-language explanation of how each data
     * type will be used, stored so clients can surface it to the user.
     */
    dataUsageDescription: {
      type: String,
      trim: true,
      maxlength: [1000, 'dataUsageDescription cannot exceed 1000 characters'],
      default:
        'NextWatch uses your data solely to personalise your movie recommendations. ' +
        'No data is sold or shared with third parties. ' +
        'You may withdraw consent at any time.',
    },

    // Five granular consent categories 
    consentItems: {
      moodSelection: {
        type: ConsentItemSchema,
        default: () => ({ granted: false, grantedAt: null }),
      },
      genrePreferences: {
        type: ConsentItemSchema,
        default: () => ({ granted: false, grantedAt: null }),
      },
      viewingHistory: {
        type: ConsentItemSchema,
        default: () => ({ granted: false, grantedAt: null }),
      },
      ratings: {
        type: ConsentItemSchema,
        default: () => ({ granted: false, grantedAt: null }),
      },
      feedback: {
        type: ConsentItemSchema,
        default: () => ({ granted: false, grantedAt: null }),
      },
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook 
// Keeps consentAccepted and consentDate in sync automatically.
ConsentSchema.pre('save', function (next) {
  const items = this.consentItems;

  // Stamp grantedAt for any item that was just turned on
  const categories = ['moodSelection', 'genrePreferences', 'viewingHistory', 'ratings', 'feedback'];
  categories.forEach((key) => {
    if (this.isModified(`consentItems.${key}.granted`) && items[key].granted) {
      items[key].grantedAt = new Date();
    }
    if (items[key].granted === false) {
      items[key].grantedAt = null;
    }
  });

  // consentAccepted = true only when every category is granted
  this.consentAccepted = categories.every((key) => items[key].granted === true);

  // consentDate = now whenever anything changed
  if (this.isModified()) {
    this.consentDate = new Date();
  }

  next();
});

// Instance helper 
/**
 * Returns a clean summary of the consent record for API responses.
 */
ConsentSchema.methods.toSummary = function () {
  return {
    _id: this._id,
    userId: this.userId,
    consentAccepted: this.consentAccepted,
    consentDate: this.consentDate,
    dataUsageDescription: this.dataUsageDescription,
    consentItems: {
      moodSelection: this.consentItems.moodSelection,
      genrePreferences: this.consentItems.genrePreferences,
      viewingHistory: this.consentItems.viewingHistory,
      ratings: this.consentItems.ratings,
      feedback: this.consentItems.feedback,
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Consent', ConsentSchema);
