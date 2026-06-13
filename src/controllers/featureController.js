const FeatureService = require('../services/featureService');
const { apiResponse } = require('../types/express.types');

const FeatureController = {
  async getFeaturedMovies(req, res, next) {
    try {
      const result = await FeatureService.getFeaturedMovies();
      res.status(200).json(apiResponse(true, 'Featured movies fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async addFeaturedMovie(req, res, next) {
    try {
      const result = await FeatureService.addFeaturedMovie(req.user._id, req.body);
      res.status(201).json(apiResponse(true, 'Movie featured successfully', result));
    } catch (error) {
      next(error);
    }
  },

  async updateFeature(req, res, next) {
    try {
      const result = await FeatureService.updateFeature(req.params.id, req.body);
      res.status(200).json(apiResponse(true, 'Feature updated', result));
    } catch (error) {
      next(error);
    }
  },

  async removeFeature(req, res, next) {
    try {
      const result = await FeatureService.removeFeature(req.params.id);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = FeatureController;
