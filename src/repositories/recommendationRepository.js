const PreferenceRepository = require('./preferenceRepository');
const MoodRepository = require('./moodRepository');
const HistoryRepository = require('./historyRepository');
const RatingRepository = require('./ratingRepository');

const RecommendationRepository = {
  async collectUserContext(userId) {
    const [preferences, latestMood, historyResult, ratings, likedIds, dislikedIds] =
      await Promise.all([
        // 1. Explicit genre / content-type preferences
        PreferenceRepository.findByUser(userId),

        // 2. Most recently logged mood
        MoodRepository.findLatestByUser(userId),

        // 3. Last 50 watched movies (enough signal, not too heavy)
        HistoryRepository.findAllByUser(userId, 50),

        // 4. All ratings with populated movie info
        RatingRepository.findByUser(userId),

        // 5. Liked movie IDs
        RatingRepository.getLikedMovieIds(userId),

        // 6. Disliked movie IDs (to exclude from results)
        RatingRepository.getDislikedMovieIds(userId),
      ]);

    // Genre preferences
    const favoriteGenres = preferences?.favoriteGenres ?? [];
    const excludedGenres = preferences?.excludedGenres ?? [];
    const preferredContentTypes = preferences?.preferredContentTypes ?? [];
    const preferredLanguages = preferences?.preferredLanguages ?? ['en'];

    // Mood
    const mood = latestMood
      ? {
          mood: latestMood.mood,
          suggestedGenres: latestMood.suggestedGenres,
          loggedAt: latestMood.createdAt,
        }
      : null;

    // Viewing history
    const viewingHistory = (historyResult.records || []).map((h) => ({
      movieId: h.movie?._id ?? h.movie,
      title: h.movie?.title ?? null,
      genres: h.movie?.genres ?? [],
      releaseYear: h.movie?.releaseYear ?? null,
      watchedAt: h.watchedAt,
      completed: h.completed,
    }));

    // Ratings
    const ratingData = ratings.map((r) => ({
      movieId: r.movieId?._id ?? r.movieId,
      title: r.movieId?.title ?? null,
      genres: r.movieId?.genres ?? [],
      rating: r.rating,
      liked: r.liked,
      disliked: r.disliked,
      feedbackText: r.feedbackText ?? null,
    }));

    // Liked / disliked IDs
    const likedMovieIds = likedIds.map((id) => id.toString());
    const dislikedMovieIds = dislikedIds.map((id) => id.toString());

    return {
      userId: userId.toString(),
      preferences: {
        favoriteGenres,
        excludedGenres,
        preferredContentTypes,
        preferredLanguages,
      },
      mood,
      viewingHistory,
      ratings: ratingData,
      likedMovieIds,
      dislikedMovieIds,
    };
  },
};

module.exports = RecommendationRepository;
