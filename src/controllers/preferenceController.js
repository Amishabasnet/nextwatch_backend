const PreferenceService = require('../services/preferenceService');
const { apiResponse } = require('../types/express.types');

const PreferenceController = {
  async getPreferences(req, res, next) {
    try {
      const result = await PreferenceService.getPreferences(req.user._id);
      res.status(200).json(apiResponse(true, 'Preferences fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async upsertPreferences(req, res, next) {
    try {
      const result = await PreferenceService.upsertPreferences(req.user._id, req.body);
      res.status(200).json(apiResponse(true, 'Preferences saved', result));
    } catch (error) {
      next(error);
    }
  },

  async deletePreferences(req, res, next) {
    try {
      const result = await PreferenceService.deletePreferences(req.user._id);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = PreferenceController;
