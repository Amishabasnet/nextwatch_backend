const Preference = require('../models/Preference');

/**
 * @desc    Create user preferences
 * @route   POST /api/preferences
 * @access  Private
 */
const createPreferences = async (req, res, next) => {
  try {
    // Check if user already has preferences
    const existingPrefs = await Preference.findOne({ user: req.user._id });
    if (existingPrefs) {
      return res.status(400).json({
        message: 'Preferences already exist for this user. Use PUT /api/preferences to update.',
      });
    }

    const {
      genrePreferences,
      favoriteActors,
      dislikedGenres,
      preferredLanguage,
      ageViewingPreference,
    } = req.body;

    // Validation (ensure arrays are arrays)
    if (genrePreferences && !Array.isArray(genrePreferences)) {
      return res.status(400).json({ message: 'genrePreferences must be an array' });
    }
    if (favoriteActors && !Array.isArray(favoriteActors)) {
      return res.status(400).json({ message: 'favoriteActors must be an array' });
    }
    if (dislikedGenres && !Array.isArray(dislikedGenres)) {
      return res.status(400).json({ message: 'dislikedGenres must be an array' });
    }

    const preference = await Preference.create({
      user: req.user._id,
      genrePreferences: genrePreferences || [],
      favoriteActors: favoriteActors || [],
      dislikedGenres: dislikedGenres || [],
      preferredLanguage: preferredLanguage || '',
      ageViewingPreference: ageViewingPreference || 'All',
    });

    res.status(201).json(preference);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user preferences
 * @route   GET /api/preferences
 * @access  Private
 */
const getPreferences = async (req, res, next) => {
  try {
    const preference = await Preference.findOne({ user: req.user._id });
    if (!preference) {
      return res.status(404).json({ message: 'Preferences not found' });
    }
    res.status(200).json(preference);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user preferences
 * @route   PUT /api/preferences
 * @access  Private
 */
const updatePreferences = async (req, res, next) => {
  try {
    const preference = await Preference.findOne({ user: req.user._id });
    if (!preference) {
      return res.status(404).json({ message: 'Preferences not found' });
    }

    const {
      genrePreferences,
      favoriteActors,
      dislikedGenres,
      preferredLanguage,
      ageViewingPreference,
    } = req.body;

    // Validation
    if (genrePreferences && !Array.isArray(genrePreferences)) {
      return res.status(400).json({ message: 'genrePreferences must be an array' });
    }
    if (favoriteActors && !Array.isArray(favoriteActors)) {
      return res.status(400).json({ message: 'favoriteActors must be an array' });
    }
    if (dislikedGenres && !Array.isArray(dislikedGenres)) {
      return res.status(400).json({ message: 'dislikedGenres must be an array' });
    }

    if (genrePreferences) preference.genrePreferences = genrePreferences;
    if (favoriteActors) preference.favoriteActors = favoriteActors;
    if (dislikedGenres) preference.dislikedGenres = dislikedGenres;
    if (preferredLanguage !== undefined) preference.preferredLanguage = preferredLanguage;
    if (ageViewingPreference !== undefined) preference.ageViewingPreference = ageViewingPreference;

    const updatedPreference = await preference.save();
    res.status(200).json(updatedPreference);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user preferences by ID
 * @route   DELETE /api/preferences/:id
 * @access  Private
 */
const deletePreferences = async (req, res, next) => {
  try {
    const preference = await Preference.findById(req.params.id);
    if (!preference) {
      return res.status(404).json({ message: 'Preferences not found' });
    }

    // Authorization check
    if (preference.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete these preferences' });
    }

    await preference.deleteOne();
    res.status(200).json({ message: 'Preferences deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPreferences,
  getPreferences,
  updatePreferences,
  deletePreferences,
};
