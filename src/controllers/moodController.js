const MoodService = require('../services/moodService');
const { apiResponse } = require('../types/express.types');

const MoodController = {
  async logMood(req, res, next) {
    try {
      const result = await MoodService.logMood(req.user._id, req.body);
      res.status(201).json(apiResponse(true, 'Mood logged', result));
    } catch (error) {
      next(error);
    }
  },

  async getMoodHistory(req, res, next) {
    try {
      const result = await MoodService.getMoodHistory(req.user._id);
      res.status(200).json(apiResponse(true, 'Mood history fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async getLatestMood(req, res, next) {
    try {
      const result = await MoodService.getLatestMood(req.user._id);
      res.status(200).json(apiResponse(true, 'Latest mood fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async getRecommendationsByMood(req, res, next) {
    try {
      const result = await MoodService.getRecommendationsByMood(req.user._id);
      res.status(200).json(apiResponse(true, 'Mood-based recommendations fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async deleteMood(req, res, next) {
    try {
      const result = await MoodService.deleteMood(req.user._id, req.params.id);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = MoodController;
