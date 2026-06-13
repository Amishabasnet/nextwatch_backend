const buildReasonString = (signals = {}) => {
  const { matchesMood, matchesGenre, matchesHistory, matchesRating, matchesWatchlist } = signals;

  const parts = [];

  if (matchesMood) parts.push('your current mood');
  if (matchesGenre) parts.push('your favorite genres');
  if (matchesHistory) parts.push('your viewing history');
  if (matchesRating) parts.push('your past ratings');
  if (matchesWatchlist) parts.push('your watchlist');

  if (parts.length === 0) {
    return 'Recommended based on trending content and your profile.';
  }

  if (parts.length === 1) {
    return `Recommended because it matches ${parts[0]}.`;
  }

  const last = parts.pop();
  return `Recommended because it matches your ${parts.join(', ')} and ${last}.`;
};

const toRecommendationDTO = (item) => ({
  movieId: item.movieId ?? item.movie_id ?? null,
  title: item.title ?? null,
  posterUrl: item.posterUrl ?? item.poster_url ?? null,
  genres: item.genres ?? [],
  rating: item.rating ?? item.averageScore ?? item.average_score ?? null,
  releaseYear: item.releaseYear ?? item.release_year ?? null,
  contentType: item.contentType ?? item.content_type ?? 'movie',
  score: item.score ?? null,           // ML confidence score (0-1)
  reason: item.reason ?? buildReasonString(item.signals ?? {}),
});

const toRecommendationsResponseDTO = (mlResponse) => {
  const items = Array.isArray(mlResponse)
    ? mlResponse
    : mlResponse.recommendations ?? mlResponse.data ?? [];

  return {
    totalRecommendations: items.length,
    recommendations: items.map(toRecommendationDTO),
  };
};

const toFallbackRecommendationsDTO = (movies, fallbackReason) => ({
  totalRecommendations: movies.length,
  source: 'fallback',
  recommendations: movies.map((m) => ({
    movieId: m._id,
    title: m.title,
    posterUrl: m.posterUrl ?? null,
    genres: m.genres ?? [],
    rating: m.averageScore ?? null,
    releaseYear: m.releaseYear ?? null,
    contentType: m.contentType ?? 'movie',
    score: null,
    reason: fallbackReason,
  })),
});

module.exports = {
  toRecommendationDTO,
  toRecommendationsResponseDTO,
  toFallbackRecommendationsDTO,
  buildReasonString,
};
