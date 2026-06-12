const { Preference } = require('../models/Preference');
const AppError = require('../utils/AppError');

/**
 * Extract only the fields we allow callers to set / update.
 * Returns undefined for fields not present in the body (so callers
 * can detect "was this field sent at all?").
 */
const extractFields = (body) => ({
  favoriteGenres:    body.favoriteGenres,
  dislikedGenres:    body.dislikedGenres,
  preferredLanguage: body.preferredLanguage,
});

// createPreference

/**
 * Creates a brand-new preference record for a user.
 * Throws 409 if a record already exists (callers should use PUT instead).
 */
const createPreference = async ({ userId, body }) => {
  const existing = await Preference.findOne({ userId });
  if (existing) {
    throw new AppError(
      'A preference record already exists for this user. Use PUT /api/preferences/:userId to update it.',
      409
    );
  }

  const { favoriteGenres, dislikedGenres, preferredLanguage } = extractFields(body);

  const preference = await Preference.create({
    userId,
    ...(favoriteGenres    !== undefined && { favoriteGenres }),
    ...(dislikedGenres    !== undefined && { dislikedGenres }),
    ...(preferredLanguage !== undefined && { preferredLanguage }),
  });

  return preference;
};

// getPreferenceByUserId
/**
 * Fetches a user's preference record and populates basic user info.
 * Throws 404 if no record exists yet.
 */
const getPreferenceByUserId = async (userId) => {
  const preference = await Preference.findOne({ userId }).populate(
    'userId',
    'fullName email'
  );
  if (!preference) {
    throw new AppError(
      'No preference record found for this user. Use POST /api/preferences to create one.',
      404
    );
  }
  return preference;
};

// updatePreference
/**
 * Partially updates a preference record — only fields present in the request
 * body are changed; absent fields are left untouched.
 *
 * Supports two update strategies for array fields:
 *
 *   Full replace (default):
 *     { "favoriteGenres": ["Action", "Drama"] }
 *     → replaces the entire array
 *
 *   Additive patch (when body contains `patchMode: true`):
 *     { "patchMode": true, "addFavorites": ["Horror"], "removeFavorites": ["Action"] }
 *     → surgically adds/removes individual genres without touching the rest
 */
const updatePreference = async ({ userId, body }) => {
  const preference = await Preference.findOne({ userId });
  if (!preference) {
    throw new AppError(
      'No preference record found for this user. Use POST /api/preferences to create one first.',
      404
    );
  }

  const { favoriteGenres, dislikedGenres, preferredLanguage } = extractFields(body);

  if (body.patchMode) {
    // Additive patch mode 
    if (body.addFavorites?.length) {
      const merged = [...new Set([...preference.favoriteGenres, ...body.addFavorites])];
      preference.favoriteGenres = merged;
    }
    if (body.removeFavorites?.length) {
      preference.favoriteGenres = preference.favoriteGenres.filter(
        (g) => !body.removeFavorites.includes(g)
      );
    }
    if (body.addDisliked?.length) {
      const merged = [...new Set([...preference.dislikedGenres, ...body.addDisliked])];
      preference.dislikedGenres = merged;
    }
    if (body.removeDisliked?.length) {
      preference.dislikedGenres = preference.dislikedGenres.filter(
        (g) => !body.removeDisliked.includes(g)
      );
    }
  } else {
    // Full-replace mode (default) 
    if (favoriteGenres    !== undefined) preference.favoriteGenres    = favoriteGenres;
    if (dislikedGenres    !== undefined) preference.dislikedGenres    = dislikedGenres;
  }

  if (preferredLanguage !== undefined) preference.preferredLanguage = preferredLanguage;

  // pre-save hook validates no overlap and bumps updatedAt
  await preference.save();
  return preference;
};

module.exports = { createPreference, getPreferenceByUserId, updatePreference };
