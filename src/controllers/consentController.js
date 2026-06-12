// const asyncHandler = require('../utils/asyncHandler');
// const AppError = require('../utils/AppError');
// const {
//   createConsent,
//   getConsentByUserId,
//   updateConsent,
// } = require('../services/consentService');

// // @desc    Create a consent record for the authenticated user
// // @route   POST /api/consent
// // @access  Private (JWT required)
// const createConsentRecord = asyncHandler(async (req, res) => {
//   const consent = await createConsent({
//     userId: req.user._id,
//     body: req.body,
//   });

//   res.status(201).json({
//     success: true,
//     message: 'Consent record created successfully.',
//     data: { consent: consent.toSummary() },
//   });
// });

// // @desc    Get a user's consent record
// // @route   GET /api/consent/:userId
// // @access  Private (JWT required — own record or admin)
// const getConsentRecord = asyncHandler(async (req, res, next) => {
//   // Users may only read their own record; admins can read any
//   if (
//     req.user.role !== 'admin' &&
//     req.user._id.toString() !== req.params.userId
//   ) {
//     return next(
//       new AppError('You are not authorised to view this consent record.', 403)
//     );
//   }

//   const consent = await getConsentByUserId(req.params.userId);

//   res.status(200).json({
//     success: true,
//     message: 'Consent record retrieved successfully.',
//     data: { consent: consent.toSummary() },
//   });
// });

// // @desc    Update a user's consent record (partial update — PATCH semantics)
// // @route   PUT /api/consent/:userId
// // @access  Private (JWT required — own record or admin)
// const updateConsentRecord = asyncHandler(async (req, res, next) => {
//   // Users may only update their own record; admins can update any
//   if (
//     req.user.role !== 'admin' &&
//     req.user._id.toString() !== req.params.userId
//   ) {
//     return next(
//       new AppError('You are not authorised to update this consent record.', 403)
//     );
//   }

//   const consent = await updateConsent({
//     userId: req.params.userId,
//     body: req.body,
//   });

//   res.status(200).json({
//     success: true,
//     message: 'Consent record updated successfully.',
//     data: { consent: consent.toSummary() },
//   });
// });

// module.exports = { createConsentRecord, getConsentRecord, updateConsentRecord };
