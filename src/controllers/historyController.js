const HistoryService = require('../services/historyService');
const { apiResponse } = require('../types/express.types');

const HistoryController = {
  async addToHistory(req, res, next) {
    try {
      const result = await HistoryService.addToHistory(req.user._id, req.body);
      res.status(201).json(apiResponse(true, 'Added to watch history', result));
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await HistoryService.getHistory(req.user._id, {
        page: Number(page),
        limit: Number(limit),
      });
      res.status(200).json(apiResponse(true, 'Watch history fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async updateHistoryEntry(req, res, next) {
    try {
      const result = await HistoryService.updateHistoryEntry(
        req.user._id,
        req.params.movieId,
        req.body
      );
      res.status(200).json(apiResponse(true, 'History entry updated', result));
    } catch (error) {
      next(error);
    }
  },

  async removeFromHistory(req, res, next) {
    try {
      const result = await HistoryService.removeFromHistory(req.user._id, req.params.movieId);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },

  async clearHistory(req, res, next) {
    try {
      const result = await HistoryService.clearHistory(req.user._id);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = HistoryController;
