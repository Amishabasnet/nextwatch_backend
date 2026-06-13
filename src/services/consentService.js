const Consent = require('../models/Consent');
const AppError = require('../utils/AppError');

// Consent options available in NextWatch
const CONSENT_CATEGORIES = [
  'moodSelection',
  'genrePreferences',
  'viewingHistory',
  'ratings',
  'feedback',
];

// Convert the submitted consent values into the format used by the database
const buildConsentItems = (body) => {
  // Use the nested consentItems object when provided; otherwise use the main body
  const source = body.consentItems || body;

  const items = {};

  CONSENT_CATEGORIES.forEach((key) => {
    if (source[key] !== undefined) {
      const raw = source[key];

      // Accept either a boolean value or an object containing granted
      const granted =
        typeof raw === 'object'
          ? Boolean(raw.granted)
          : Boolean(raw);

      items[`consentItems.${key}.granted`] = granted;
    }
  });

  return items;
};

// Create a new consent record for a user
const createConsent = async ({ userId, body }) => {
  // Check whether the user already has a consent record
  const existing = await Consent.findOne({ userId });

  if (existing) {
    throw new AppError(
      'A consent record already exists for this user. Use PUT to update it.',
      409
    );
  }

  const consentItems = {};

  // Prepare every consent option before creating the record
  CONSENT_CATEGORIES.forEach((key) => {
    const source = body.consentItems || body;
    const raw = source[key];

    consentItems[key] = {
      // Use the submitted value or false when no value was provided
      granted:
        raw !== undefined
          ? typeof raw === 'object'
            ? Boolean(raw.granted)
            : Boolean(raw)
          : false,
      grantedAt: null,
    };
  });

  const consent = await Consent.create({
    userId,
    dataUsageDescription: body.dataUsageDescription,
    consentItems,
  });

  return consent;
};

// Find the consent record belonging to a specific user
const getConsentByUserId = async (userId) => {
  // Include the user's name and email with the consent information
  const consent = await Consent.findOne({ userId }).populate(
    'userId',
    'fullName email'
  );

  if (!consent) {
    throw new AppError('No consent record found for this user.', 404);
  }

  return consent;
};

// Update the existing consent record of a user
const updateConsent = async ({ userId, body }) => {
  const consent = await Consent.findOne({ userId });

  if (!consent) {
    throw new AppError(
      'No consent record found for this user. Use POST to create one first.',
      404
    );
  }

  // Update only the consent options included in the request
  CONSENT_CATEGORIES.forEach((key) => {
    const source = body.consentItems || body;

    if (source[key] !== undefined) {
      const raw = source[key];

      const granted =
        typeof raw === 'object'
          ? Boolean(raw.granted)
          : Boolean(raw);

      consent.consentItems[key].granted = granted;
    }
  });

  // Update the data usage explanation when a new value is provided
  if (body.dataUsageDescription !== undefined) {
    consent.dataUsageDescription = body.dataUsageDescription;
  }

  // Tell Mongoose that values inside consentItems have changed
  consent.markModified('consentItems');

  await consent.save();

  return consent;
};

module.exports = {
  CONSENT_CATEGORIES,
  createConsent,
  getConsentByUserId,
  updateConsent,
};