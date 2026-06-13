const { Preference } = require('../models/Preference');
const AppError = require('../utils/AppError');

// Get only the preference fields that users are allowed to submit.
// Fields that were not included in the request will remain undefined.
const extractFields = (body) => ({
  favoriteGenres: body.favoriteGenres,
  dislikedGenres: body.dislikedGenres,
  preferredLanguage: body.preferredLanguage,
});

// Create a new preference record for a user
const createPreference = async ({ userId, body }) => {
  // Check whether the user already has saved preferences
  const existing = await Preference.findOne({ userId });

  if (existing) {
    throw new AppError(
      'A preference record already exists for this user. Use PUT /api/preferences/:userId to update it.',
      409
    );
  }

  const {
    favoriteGenres,
    dislikedGenres,
    preferredLanguage,
  } = extractFields(body);

  // Only include fields that were provided in the request
  const preference = await Preference.create({
    userId,
    ...(favoriteGenres !== undefined && { favoriteGenres }),
    ...(dislikedGenres !== undefined && { dislikedGenres }),
    ...(preferredLanguage !== undefined && { preferredLanguage }),
  });

  return preference;
};

// Find the preference record belonging to a particular user
const getPreferenceByUserId = async (userId) => {
  // Include the user's name and email with the preference details
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

// Update an existing preference record
const updatePreference = async ({ userId, body }) => {
  const preference = await Preference.findOne({ userId });

  if (!preference) {
    throw new AppError(
      'No preference record found for this user. Use POST /api/preferences to create one first.',
      404
    );
  }

  const {
    favoriteGenres,
    dislikedGenres,
    preferredLanguage,
  } = extractFields(body);

  if (body.patchMode) {
    // Add or remove specific genres without replacing the complete list

    if (body.addFavorites?.length) {
      // Add new favourite genres and remove any duplicates
      const merged = [
        ...new Set([
          ...preference.favoriteGenres,
          ...body.addFavorites,
        ]),
      ];

      preference.favoriteGenres = merged;
    }

    if (body.removeFavorites?.length) {
      // Remove the selected genres from the favourite list
      preference.favoriteGenres = preference.favoriteGenres.filter(
        (genre) => !body.removeFavorites.includes(genre)
      );
    }

    if (body.addDisliked?.length) {
      // Add new disliked genres and remove any duplicates
      const merged = [
        ...new Set([
          ...preference.dislikedGenres,
          ...body.addDisliked,
        ]),
      ];

      preference.dislikedGenres = merged;
    }

    if (body.removeDisliked?.length) {
      // Remove the selected genres from the disliked list
      preference.dislikedGenres = preference.dislikedGenres.filter(
        (genre) => !body.removeDisliked.includes(genre)
      );
    }
  } else {
    // Replace the complete genre lists when patch mode is not enabled
    if (favoriteGenres !== undefined) {
      preference.favoriteGenres = favoriteGenres;
    }

    if (dislikedGenres !== undefined) {
      preference.dislikedGenres = dislikedGenres;
    }
  }

  // Update the language only when it was included in the request
  if (preferredLanguage !== undefined) {
    preference.preferredLanguage = preferredLanguage;
  }

  // Saving runs the schema validation and updates the modified date
  await preference.save();

  return preference;
};

module.exports = {
  createPreference,
  getPreferenceByUserId,
  updatePreference,
};