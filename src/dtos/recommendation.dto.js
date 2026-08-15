const buildReasonString = (signals = {}) => {
  const { matchesMood, matchesGenre, matchesHistory, matchesRating, matchesWatchlist, matchesCollaborative } = signals;

  const parts = [];

  if (matchesMood) parts.push('your current mood');
  if (matchesGenre) parts.push('your favorite genres');
  if (matchesHistory) parts.push('your viewing history');
  if (matchesRating) parts.push('your past ratings');
  if (matchesWatchlist) parts.push('your watchlist');
  if (matchesCollaborative) parts.push('users with similar taste to yours');

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
    movieId: m._id ?? m.movieId,
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

// A single scored candidate -> the movie shape the frontend's
// normalizeMovie()/normalizeRecommendations() expects.
const toScoredMovieDTO = ({ movie, score, reason }) => ({
  movieId: movie._id ?? movie.movieId,
  title: movie.title,
  description: movie.description,
  genres: movie.genres ?? [],
  contentType: movie.contentType ?? 'movie',
  rating: movie.rating,
  releaseYear: movie.releaseYear,
  language: movie.language,
  posterUrl: movie.posterUrl ?? null,
  trailerUrl: movie.trailerUrl,
  imdbId: movie.imdbId,
  averageScore: movie.averageScore,
  moods: movie.moods,
  score: score / 100,
  reason,
});

// A single scored candidate from the ML service -> the movie shape the
// frontend's normalizeMovie()/normalizeRecommendations() expects. The ML
// response is thinner than a full Mongo movie doc (no description,
// language, trailer, etc.) since the Python service only knows about its
// own mock catalog fields — that's fine, the dashboard cards only render
// what's mapped here.
const fromMLRecommendation = (item) => ({
  movieId: item.movie_id,
  title: item.title,
  description: null,
  genres: item.genres ?? [],
  contentType: item.content_type ?? 'movie',
  rating: item.rating,
  releaseYear: item.release_year,
  language: null,
  posterUrl: item.poster_url ?? null,
  trailerUrl: null,
  imdbId: null,
  averageScore: item.rating,
  moods: [],
  score: item.score, // already 0-1 from the ML service
  reason: item.reason,
  signals: item.signals ?? {},
});

// Splits recommendations into the personalized / moodBased / historyBased
// buckets the dashboard renders as separate rows. `recommendations` is kept
// for backward compatibility with any consumer still reading a flat list.
const toBucketedRecommendationsDTO = ({ personalized, moodBased, historyBased }, source = 'fallback') => ({
  source,
  totalRecommendations: personalized.length,
  recommendations: personalized.map(toScoredMovieDTO),
  personalized: personalized.map(toScoredMovieDTO),
  moodBased: moodBased.map(toScoredMovieDTO),
  historyBased: historyBased.map(toScoredMovieDTO),
});

// Same bucketing, but for results that already came back from the ML
// service in RecommendedMovie shape (snake_case fields, score 0-1, no
// `movie` wrapper) instead of the {movie, score, reason} shape the
// JS rule-based scorer produces.
const toBucketedMLRecommendationsDTO = ({ personalized, moodBased, historyBased }) => ({
  source: 'ml',
  totalRecommendations: personalized.length,
  recommendations: personalized.map(fromMLRecommendation),
  personalized: personalized.map(fromMLRecommendation),
  moodBased: moodBased.map(fromMLRecommendation),
  historyBased: historyBased.map(fromMLRecommendation),
});

module.exports = {
  toRecommendationDTO,
  toRecommendationsResponseDTO,
  toFallbackRecommendationsDTO,
  toBucketedRecommendationsDTO,
  toBucketedMLRecommendationsDTO,
  buildReasonString,
};