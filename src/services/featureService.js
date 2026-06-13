const FeatureRepository = require('../repositories/featureRepository');
const MovieRepository = require('../repositories/movieRepository');
const { toMovieDTO } = require('../dtos/movie.dto');
const { NotFoundError } = require('../errors/AppError');

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
