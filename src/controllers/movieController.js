const MovieService = require('../services/movieService');
const { apiResponse } = require('../types/express.types');

const MovieController = {
  async createMovie(req, res, next) {
    try {
      const result = await MovieService.createMovie(req.body);
      res.status(201).json(apiResponse(true, 'Movie created', result));
    } catch (error) {
      next(error);
    }
  },

  async getMovieById(req, res, next) {
    try {
      const result = await MovieService.getMovieById(req.params.id);
      res.status(200).json(apiResponse(true, 'Movie fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async getAllMovies(req, res, next) {
    try {
      const { page = 1, limit = 10, genre, contentType, language } = req.query;
      const result = await MovieService.getAllMovies({
        page: Number(page),
        limit: Number(limit),
        genre,
        contentType,
        language,
      });
      res.status(200).json(apiResponse(true, 'Movies fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async searchMovies(req, res, next) {
    try {
      const result = await MovieService.searchMovies(req.query.q || '');
      res.status(200).json(apiResponse(true, 'Search results', result));
    } catch (error) {
      next(error);
    }
  },

  async getPersonalizedMovies(req, res, next) {
    try {
      const result = await MovieService.getPersonalizedMovies(req.user._id);
      res.status(200).json(apiResponse(true, 'Personalized recommendations fetched', result));
    } catch (error) {
      next(error);
    }
  },

  async updateMovie(req, res, next) {
    try {
      const result = await MovieService.updateMovie(req.params.id, req.body);
      res.status(200).json(apiResponse(true, 'Movie updated', result));
    } catch (error) {
      next(error);
    }
  },

  async deleteMovie(req, res, next) {
    try {
      const result = await MovieService.deleteMovie(req.params.id);
      res.status(200).json(apiResponse(true, result.message, null));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = MovieController;
