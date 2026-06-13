const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },
    featuredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    label: {
      type: String,
      trim: true,
      default: 'Featured',
    },
    priority: {
      type: Number,
      default: 0,
    },
    activeFrom: {
      type: Date,
      default: Date.now,
    },
    activeTo: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Feature = mongoose.model('Feature', featureSchema);
module.exports = Feature;
