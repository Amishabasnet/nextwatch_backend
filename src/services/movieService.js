const MovieRepository = require('../repositories/movieRepository');
const PreferenceRepository = require('../repositories/preferenceRepository');
const { toMovieDTO, toMovieListDTO } = require('../dtos/movie.dto');
const { NotFoundError } = require('../errors/AppError');
const { paginationMeta } = require('../types/express.types');

const MovieService = {
  async createMovie(data) {
    const movie = await MovieRepository.create(data);
    return toMovieDTO(movie);
  },

  async getMovieById(id) {
    const movie = await MovieRepository.findById(id);
    if (!movie) throw new NotFoundError('Movie not found');
    return toMovieDTO(movie);
  },

  async getAllMovies({ page = 1, limit = 10, genre, contentType, language, sort } = {}) {
    const filters = {};
    if (genre) filters.genres = genre;
    if (contentType) filters.contentType = contentType;
    if (language) filters.language = language;

    const { movies, total } = await MovieRepository.findAll({ page, limit, filters, sort });
    return {
      movies: toMovieListDTO(movies),
      meta: paginationMeta(page, limit, total),
    };
  },

  async getTopRatedMovies(limit = 10) {
    const movies = await MovieRepository.findTopRated(limit);
    return toMovieListDTO(movies);
  },

  async searchMovies(query) {
    const movies = await MovieRepository.search(query);
    return toMovieListDTO(movies);
  },

  async searchMoviesWithFilters({ title, keyword, genre, mood, rating, releaseYear, language } = {}) {
    const movies = await MovieRepository.searchWithFilters({
      title,
      keyword,
      genre,
      mood,
      minRating: rating,
      releaseYear,
      language,
    });
    return toMovieListDTO(movies);
  },

  async getRelatedMovies(id, limit = 12) {
    const movie = await MovieRepository.findById(id);
    if (!movie) throw new NotFoundError('Movie not found');
    const related = await MovieRepository.findRelated(id, movie.genres || [], limit);
    return toMovieListDTO(related);
  },

  async getPersonalizedMovies(userId) {
    const prefs = await PreferenceRepository.findByUser(userId);
    if (!prefs || prefs.favoriteGenres.length === 0) {
      const { movies } = await MovieRepository.findAll({ limit: 20 });
      return toMovieListDTO(movies);
    }
    const movies = await MovieRepository.findByGenres(prefs.favoriteGenres);
    return toMovieListDTO(movies);
  },

  async updateMovie(id, data) {
    const movie = await MovieRepository.update(id, data);
    if (!movie) throw new NotFoundError('Movie not found');
    return toMovieDTO(movie);
  },

  async deleteMovie(id) {
    const movie = await MovieRepository.delete(id);
    if (!movie) throw new NotFoundError('Movie not found');
    return { message: 'Movie deleted successfully' };
  },
};

module.exports = MovieService;
