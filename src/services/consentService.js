const Consent = require('../models/Consent');
const AppError = require('../utils/AppError');

const CONSENT_CATEGORIES = [
  'moodSelection',
  'genrePreferences',
  'viewingHistory',
  'ratings',
  'feedback',
];

/**
 * Build the consentItems sub-document from a flat request body.
 *
 * Accepts either the full nested shape:
 *   { consentItems: { moodSelection: { granted: true }, ... } }
 *
 * Or a convenient flat shape:
 *   { moodSelection: true, genrePreferences: false, ... }
 */
const buildConsentItems = (body) => {
  // Prefer explicit nested shape; fall back to flat keys on root
  const source = body.consentItems || body;

  const items = {};
  CONSENT_CATEGORIES.forEach((key) => {
    if (source[key] !== undefined) {
      const raw = source[key];
      // Accept { granted: bool } or a plain boolean
      const granted = typeof raw === 'object' ? Boolean(raw.granted) : Boolean(raw);
      items[`consentItems.${key}.granted`] = granted;
    }
  });
  return items;
};

/**
 * Create a brand-new consent record for a user.
 * Throws 409 if one already exists.
 */
const createConsent = async ({ userId, body }) => {
  const existing = await Consent.findOne({ userId });
  if (existing) {
    throw new AppError(
      'A consent record already exists for this user. Use PUT to update it.',
      409
    );
  }

  const consentItems = {};
  CONSENT_CATEGORIES.forEach((key) => {
    const source = body.consentItems || body;
    const raw = source[key];
    consentItems[key] = {
      granted: raw !== undefined
        ? (typeof raw === 'object' ? Boolean(raw.granted) : Boolean(raw))
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

/**
 * Fetch a user's consent record.
 * Throws 404 if none exists yet.
 */
const getConsentByUserId = async (userId) => {
  const consent = await Consent.findOne({ userId }).populate('userId', 'fullName email');
  if (!consent) {
    throw new AppError('No consent record found for this user.', 404);
  }
  return consent;
};

/**
 * Partial-update a consent record.
 * Only fields present in the request body are changed.
 */
const updateConsent = async ({ userId, body }) => {
  const consent = await Consent.findOne({ userId });
  if (!consent) {
    throw new AppError(
      'No consent record found for this user. Use POST to create one first.',
      404
    );
  }

  // Apply category changes
  CONSENT_CATEGORIES.forEach((key) => {
    const source = body.consentItems || body;
    if (source[key] !== undefined) {
      const raw = source[key];
      const granted = typeof raw === 'object' ? Boolean(raw.granted) : Boolean(raw);
      consent.consentItems[key].granted = granted;
    }
  });

  // Apply top-level field changes
  if (body.dataUsageDescription !== undefined) {
    consent.dataUsageDescription = body.dataUsageDescription;
  }

  // Mark nested path as modified so Mongoose detects the change
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
