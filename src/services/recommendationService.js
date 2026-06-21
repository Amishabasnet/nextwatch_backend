const mlClient = require('../config/mlClient');
const RecommendationRepository = require('../repositories/recommendationRepository');
const MovieRepository = require('../repositories/movieRepository');
const {
  toRecommendationsResponseDTO,
  toFallbackRecommendationsDTO,
} = require('../dtos/recommendation.dto');

const ML_RECOMMEND_LIMIT = 10;
const buildMLPayload = (context, limit) => ({
  userId: context.userId,
  mood: context.mood
    ? {
        mood: context.mood.mood,
        suggested_genres: context.mood.suggestedGenres,
        logged_at: context.mood.loggedAt,
      }
    : null,
  favoriteGenres: context.preferences.favoriteGenres,
  excludedGenres: context.preferences.excludedGenres,
  preferredContentTypes: context.preferences.preferredContentTypes,
  preferredLanguages: context.preferences.preferredLanguages,
  viewingHistory: context.viewingHistory.map((h) => ({
    movie_id: h.movieId,
    title: h.title,
    genres: h.genres,
    release_year: h.releaseYear,
    watched_at: h.watchedAt,
    completed: h.completed,
  })),
  ratings: context.ratings.map((r) => ({
    movie_id: r.movieId,
    title: r.title,
    genres: r.genres,
    rating: r.rating,
    liked: r.liked,
    disliked: r.disliked,
    feedback_text: r.feedbackText,
  })),
  likedMovieIds: context.likedMovieIds,
  dislikedMovieIds: context.dislikedMovieIds,
  limit,
});

const getFallbackRecommendations = async (context, limit) => {
  const { favoriteGenres } = context.preferences;

  if (favoriteGenres && favoriteGenres.length > 0) {
    const movies = await MovieRepository.findByGenres(favoriteGenres);
    return toFallbackRecommendationsDTO(
      movies.slice(0, limit),
      'Recommended based on your favorite genres while our recommendation engine is unavailable.'
    );
  }

  const { movies } = await MovieRepository.findAll({ limit });
  return toFallbackRecommendationsDTO(
    movies,
    'Recommended based on trending content while our recommendation engine is unavailable.'
  );
};

const RecommendationService = {
  async getRecommendations(userId, limit = ML_RECOMMEND_LIMIT) {
    const context = await RecommendationRepository.collectUserContext(userId);

    try {
      const { data } = await mlClient.post('/ml/recommend', buildMLPayload(context, limit));
      return toRecommendationsResponseDTO(data);
    } catch (error) {
      return getFallbackRecommendations(context, limit);
    }
  },
};

module.exports = RecommendationService;
