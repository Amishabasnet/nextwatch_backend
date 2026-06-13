const mongoose = require('mongoose');

// This structure is used for each individual consent option
const ConsentItemSchema = new mongoose.Schema(
  {
    // Shows whether the user has agreed to this type of data use
    granted: {
      type: Boolean,
      required: true,
      default: false,
    },

    // Stores the date when this consent option was last accepted
    grantedAt: {
      type: Date,
      default: null,
    },
  },
  {
    // These small embedded records do not need separate IDs
    _id: false,
  }
);

const ConsentSchema = new mongoose.Schema(
  {
    // Connect the consent record to a specific user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      unique: true, // Each user can only have one consent record
      index: true,
    },

    // Becomes true only when the user accepts every consent category
    consentAccepted: {
      type: Boolean,
      default: false,
    },

    // Stores the date of the most recent consent change
    consentDate: {
      type: Date,
      default: null,
    },

    // Explains how NextWatch uses the user's information
    dataUsageDescription: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        'dataUsageDescription cannot exceed 1000 characters',
      ],
      default:
        'NextWatch uses your data solely to personalise your movie recommendations. ' +
        'No data is sold or shared with third parties. ' +
        'You may withdraw consent at any time.',
    },

    // Separate consent options for each type of user data
    consentItems: {
      moodSelection: {
        type: ConsentItemSchema,
        default: () => ({
          granted: false,
          grantedAt: null,
        }),
      },

      genrePreferences: {
        type: ConsentItemSchema,
        default: () => ({
          granted: false,
          grantedAt: null,
        }),
      },

      viewingHistory: {
        type: ConsentItemSchema,
        default: () => ({
          granted: false,
          grantedAt: null,
        }),
      },

      ratings: {
        type: ConsentItemSchema,
        default: () => ({
          granted: false,
          grantedAt: null,
        }),
      },

      feedback: {
        type: ConsentItemSchema,
        default: () => ({
          granted: false,
          grantedAt: null,
        }),
      },
    },
  },
  {
    // Automatically add the creation and last updated dates
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Update the consent information before saving the record
ConsentSchema.pre('save', function (next) {
  const items = this.consentItems;

  // List of consent categories available in NextWatch
  const categories = [
    'moodSelection',
    'genrePreferences',
    'viewingHistory',
    'ratings',
    'feedback',
  ];

  categories.forEach((key) => {
    // Record the date when a consent option is accepted
    if (
      this.isModified(`consentItems.${key}.granted`) &&
      items[key].granted
    ) {
      items[key].grantedAt = new Date();
    }

    // Remove the acceptance date when consent is withdrawn
    if (items[key].granted === false) {
      items[key].grantedAt = null;
    }
  });

  // Mark the full consent as accepted only when every option is enabled
  this.consentAccepted = categories.every(
    (key) => items[key].granted === true
  );

  // Update the consent date whenever the record changes
  if (this.isModified()) {
    this.consentDate = new Date();
  }

  next();
});

// Return the consent information needed in API responses
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