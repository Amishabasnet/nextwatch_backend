const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  createConsent,
  getConsentByUserId,
  updateConsent,
} = require('../services/consentService');

// Create a consent record for the currently logged-in user
const createConsentRecord = asyncHandler(async (req, res) => {
  const consent = await createConsent({
    userId: req.user._id,
    body: req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Consent record created successfully.',
    data: { consent: consent.toSummary() },
  });
});

// Get the consent record of a specific user
const getConsentRecord = asyncHandler(async (req, res, next) => {
  // Regular users can only voew their own consent record and admin is allowed to view any user's record
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to view this consent record.', 403)
    );
  }

  const consent = await getConsentByUserId(req.params.userId);

  res.status(200).json({
    success: true,
    message: 'Consent record retrieved successfully.',
    data: { consent: consent.toSummary() },
  });
});

// Update the consent record of a specific user
const updateConsentRecord = asyncHandler(async (req, res, next) => {
  // Users may only update their own record and admins can update any user's record
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to update this consent record.', 403)
    );
  }

  const consent = await updateConsent({
    userId: req.params.userId,
    body: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Consent record updated successfully.',
    data: { consent: consent.toSummary() },
  });
});

module.exports = { createConsentRecord, getConsentRecord, updateConsentRecord };
