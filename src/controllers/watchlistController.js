const WatchlistService = require('../services/watchlistService');
const { apiResponse } = require('../types/express.types');

const WatchlistController = {
  async addToWatchlist(req, res, next) {
    try {
      const result = await WatchlistService.addToWatchlist(req.user._id, req.body);
      res.status(201).json(apiResponse(true, 'Added to watchlist', result));
    } catch (error) {
      next(error);
    }
  },

  async getWatchlist(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await WatchlistService.getWatchlist(req.user._id, {
        page: Number(page),
        limit: Number(limit),
      });
      res.status(200).json(apiResponse(true, 'Watchlist fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async removeFromWatchlist(req, res, next) {
    try {
      const result = await WatchlistService.removeFromWatchlist(req.user._id, req.params.movieId);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },

  async clearWatchlist(req, res, next) {
    try {
      const result = await WatchlistService.clearWatchlist(req.user._id);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = WatchlistController;
