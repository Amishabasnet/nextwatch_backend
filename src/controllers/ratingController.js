const RatingService = require('../services/ratingService');
const { apiResponse } = require('../types/express.types');

const RatingController = {
  async createRating(req, res, next) {
    try {
      const result = await RatingService.createRating(req.user._id, req.body);
      res.status(201).json(apiResponse(true, 'Rating submitted successfully', result));
    } catch (error) {
      next(error);
    }
  },

  async getRatingsByMovie(req, res, next) {
    try {
      const result = await RatingService.getRatingsByMovie(req.params.movieId);
      res.status(200).json(apiResponse(true, 'Movie ratings fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async getRatingsByUser(req, res, next) {
    try {
      const result = await RatingService.getRatingsByUser(req.params.userId);
      res.status(200).json(apiResponse(true, 'User ratings fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async updateRating(req, res, next) {
    try {
      const result = await RatingService.updateRating(req.user._id, req.params.id, req.body);
      res.status(200).json(apiResponse(true, 'Rating updated successfully', result));
    } catch (error) {
      next(error);
    }
  },

  async deleteRating(req, res, next) {
    try {
      const result = await RatingService.deleteRating(req.user._id, req.params.id);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },

  async getMyImplicitPreferences(req, res, next) {
    try {
      const result = await RatingService.getImplicitPreferences(req.user._id);
      res
        .status(200)
        .json(apiResponse(true, 'Implicit preferences derived from your ratings', result));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = RatingController;
