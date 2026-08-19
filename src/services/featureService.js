const FeatureRepository = require('../repositories/featureRepository');
const MovieRepository = require('../repositories/movieRepository');
const { toMovieDTO } = require('../dtos/movie.dto');
const { NotFoundError } = require('../errors/appError');

const FeatureService = {
  async getFeaturedMovies() {
    const features = await FeatureRepository.findActive();
    return features.map((f) => ({
      featureId: f._id,
      label: f.label,
      priority: f.priority,
      movie: f.movie ? toMovieDTO(f.movie) : null,
    }));
  },

  // Admin management list — includes inactive/expired/scheduled entries too.
  async getAllFeaturesAdmin() {
    const features = await FeatureRepository.findAll();
    return features.map((f) => ({
      featureId: f._id,
      label: f.label,
      priority: f.priority,
      isActive: f.isActive,
      activeFrom: f.activeFrom,
      activeTo: f.activeTo,
      featuredBy: f.featuredBy ? { id: f.featuredBy._id, name: f.featuredBy.name } : null,
      movie: f.movie ? toMovieDTO(f.movie) : null,
      createdAt: f.createdAt,
    }));
  },

  async addFeaturedMovie(userId, { movieId, label, priority, activeFrom, activeTo }) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) throw new NotFoundError('Movie not found');

    const feature = await FeatureRepository.create({
      movie: movieId,
      featuredBy: userId,
      label,
      priority,
      activeFrom,
      activeTo,
    });

    return feature;
  },

  async updateFeature(featureId, data) {
    const feature = await FeatureRepository.update(featureId, data);
    if (!feature) throw new NotFoundError('Featured entry not found');
    return feature;
  },

  async removeFeature(featureId) {
    const feature = await FeatureRepository.delete(featureId);
    if (!feature) throw new NotFoundError('Featured entry not found');
    return { message: 'Feature removed successfully' };
  },
};

module.exports = FeatureService;
