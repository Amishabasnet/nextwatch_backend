const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  createPreference,
  getPreferenceByUserId,
  updatePreference,
} = require('../services/preferenceService');


// @desc    Create genre preferences for the authenticated user
// @route   POST /api/preferences
// @access  Private (JWT required)
const createPreferenceRecord = asyncHandler(async (req, res) => {
  const preference = await createPreference({
    userId: req.user._id,
    body: req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Genre preferences saved successfully.',
    data: { preference: preference.toSummary() },
  });
});


// @desc    Get a user's genre preferences
// @route   GET /api/preferences/:userId
// @access  Private (JWT required — own record or admin)

const getPreferenceRecord = asyncHandler(async (req, res, next) => {
  // Users can only read their own preferences; admins can read any
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
    data: { preference: preference.toSummary() },
  });
});

// @desc    Update a user's genre preferences (partial update)
// @route   PUT /api/preferences/:userId
// @access  Private (JWT required — own record or admin)
//
// Supports two update modes (see preferenceService for details):
//   Default  — full replace of favoriteGenres / dislikedGenres arrays
//   PatchMode— set patchMode:true and use addFavorites / removeFavorites etc.

const updatePreferenceRecord = asyncHandler(async (req, res, next) => {
  // Users can only update their own preferences; admins can update any
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to update these preferences.', 403)
    );
  }

  const preference = await updatePreference({
    userId: req.params.userId,
    body: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Genre preferences updated successfully.',
    data: { preference: preference.toSummary() },
  });
});

module.exports = {
  createPreferenceRecord,
  getPreferenceRecord,
  updatePreferenceRecord,
};
