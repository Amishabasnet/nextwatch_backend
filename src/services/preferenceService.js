const PreferenceRepository = require('../repositories/preferenceRepository');
const { NotFoundError } = require('../errors/AppError');

const PreferenceService = {
  async getPreferences(userId) {
    const prefs = await PreferenceRepository.findByUser(userId);
    if (!prefs) {
      throw new NotFoundError('Preferences not found. Please set your preferences first.');
    }
    return prefs;
  },

  async upsertPreferences(userId, data) {
    return PreferenceRepository.upsert(userId, data);
  },

  async deletePreferences(userId) {
    const prefs = await PreferenceRepository.findByUser(userId);
    if (!prefs) {
      throw new NotFoundError('Preferences not found');
    }
    await PreferenceRepository.delete(userId);
    return { message: 'Preferences deleted successfully' };
  },
};

module.exports = PreferenceService;
