const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const {
  createPreference,
  getPreferenceByUserId,
  updatePreference,
} = require('../services/preferenceService');

// Create and save preferences for the logged-in user
const createPreferenceRecord = asyncHandler(async (req, res) => {
  const preference = await createPreference({
    userId: req.user._id,
    body: req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Genre preferences saved successfully.',
    data: {
      preference: preference.toSummary(),
    },
  });
});

// Get the saved preferences of a specific user
const getPreferenceRecord = asyncHandler(async (req, res, next) => {
  // Regular users can only view their own preferences.
  // An admin is allowed to view any user's preferences.
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to view these preferences.', 403)
    );
  }

  const preference = await getPreferenceByUserId(req.params.userId);

  res.status(200).json({
    success: true,
    message: 'Genre preferences retrieved successfully.',
    data: {
      preference: preference.toSummary(),
    },
  });
});

// Update the saved preferences of a specific user
const updatePreferenceRecord = asyncHandler(async (req, res, next) => {
  // Regular users can only update their own preferences.
  // An admin is allowed to update any user's preferences.
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to update these preferences.', 403)
    );
  }

  // The normal update replaces the complete genre lists.
  // Patch mode can add or remove individual genres.
  const preference = await updatePreference({
    userId: req.params.userId,
    body: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Genre preferences updated successfully.',
    data: {
      preference: preference.toSummary(),
    },
  });
});

module.exports = {
  createPreferenceRecord,
  getPreferenceRecord,
  updatePreferenceRecord,
};