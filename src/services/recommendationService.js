const RecommendationRepository = require('../repositories/recommendationRepository');
const MovieRepository           = require('../repositories/movieRepository');
const mlClient = require('../config/mlClient');
const { CollaborativeModel } = require('./collaborativeFilteringService');
const {
  toRecommendationsResponseDTO,
  toFallbackRecommendationsDTO,
  toBucketedRecommendationsDTO,
  toBucketedMLRecommendationsDTO,
} = require('../dtos/recommendation.dto');

const MOOD_GENRE_MAP = {
  Happy:     ['Comedy', 'Animation', 'Adventure'],
  Sad:       ['Drama', 'Romance'],
  Excited:   ['Action', 'Thriller', 'Adventure'],
  Relaxed:   ['Documentary', 'Animation', 'Comedy'],
  Scared:    ['Horror', 'Mystery', 'Thriller'],
  Romantic:  ['Romance', 'Drama'],
  Motivated: ['Action', 'Adventure', 'Sci-Fi'],
  Bored:     ['Comedy', 'Action', 'Fantasy'],
  Nostalgic: ['Drama', 'Romance', 'Western'],
};

const ML_RECOMMEND_LIMIT = 20;
// The ML service ranks by one blended hybrid score, so asking for only
// ML_RECOMMEND_LIMIT candidates means the mood/history buckets get filtered
// from the exact same tiny top-N list as "personalized" — since the top
// overall movies usually satisfy several signals at once, all three
// sections end up showing the same titles. Fetching a wider pool first
// gives each bucket enough distinct candidates to actually differ.
const ML_CANDIDATE_POOL = 50;

function scoreMovie(movie, context) {
  let score = 0;
  const reasons = [];
  let matchesMood = false;
  let matchesLikedTaste = false;
  let matchesCollaborative = false;

  const {
    mood,
    preferences = {},
    viewingHistory = [],
    ratings = [],
    likedMovieIds = [],
    dislikedMovieIds = [],
    collabScores = {},
  } = context;

  const movieId = String(movie._id ?? movie.id ?? '');
  const movieGenres = movie.genres ?? [];

  if (dislikedMovieIds.map(String).includes(movieId)) return null;

  const watched = viewingHistory.some(h => String(h.movieId) === movieId);
  if (!watched) {
    score += 20;
  } else {
    score -= 5;
  }

  if (mood && mood.mood) {
    const moodGenres = MOOD_GENRE_MAP[mood.mood] ?? mood.suggestedGenres ?? [];
    const overlap = movieGenres.filter(g => moodGenres.includes(g));
    if (overlap.length > 0) {
      const pts = Math.min(35, overlap.length * 12);
      score += pts;
      matchesMood = true;
      reasons.push(`Matches your ${mood.mood} mood (${overlap.join(', ')})`);
    }
    // Direct mood tag on movie
    if (Array.isArray(movie.moods) && movie.moods.includes(mood.mood)) {
      score += 10;
      matchesMood = true;
      reasons.push(`Tagged as a ${mood.mood} film`);
    }
  }

  const favourites = preferences.favoriteGenres ?? [];
  const excluded   = preferences.excludedGenres  ?? [];

  const favOverlap = movieGenres.filter(g => favourites.includes(g));
  const excOverlap = movieGenres.filter(g => excluded.includes(g));

  if (favOverlap.length > 0) {
    const pts = Math.min(25, favOverlap.length * 10);
    score += pts;
    reasons.push(`Matches your favourite genres (${favOverlap.join(', ')})`);
  }
  if (excOverlap.length > 0) {
    score -= excOverlap.length * 15; // heavy penalty for excluded genres
  }

  const likedRatings = ratings.filter(r => r.liked || r.rating >= 7);
  const likedGenres  = likedRatings.flatMap(r => r.genres ?? []);
  const likedOverlap = movieGenres.filter(g => likedGenres.includes(g));
  if (likedOverlap.length > 0) {
    score += Math.min(10, likedOverlap.length * 4);
    matchesLikedTaste = true;
    reasons.push('Similar to movies you liked');
  }

  const avg = movie.averageScore ?? 0;
  if (avg >= 8.5)      { score += 10; reasons.push('Critically acclaimed'); }
  else if (avg >= 7.5) { score += 6;  }
  else if (avg >= 6.5) { score += 3;  }

  const prefLangs  = preferences.preferredLanguages  ?? [];
  const prefTypes  = preferences.preferredContentTypes ?? [];

  const normalizedPrefLangs = prefLangs.map(l => String(l).toLowerCase());
  if (normalizedPrefLangs.length > 0 && movie.language && normalizedPrefLangs.includes(String(movie.language).toLowerCase())) {
    score += 5;
    reasons.push('In your preferred language');
  }
  if (prefTypes.length > 0 && prefTypes.includes(movie.contentType)) {
    score += 5;
  }

  // Collaborative filtering: "users with similar taste to yours also
  // liked this" - ignores movie metadata entirely, uses the platform-wide
  // ratings matrix instead. Contributes 0 for a brand-new user or a movie
  // nobody has rated yet (cold start) - the signals above carry the
  // recommendation in that case.
  const collabScore = collabScores[movieId] ?? 0;
  if (collabScore >= 0.6) { // predicted rating ~6+/10
    score += Math.round(collabScore * 20); // up to 20 pts, same order of magnitude as other signals
    matchesCollaborative = true;
    reasons.push('Liked by users with similar taste to yours');
  }

  if (reasons.length === 0) {
    reasons.push('Trending in our catalogue');
  }

  return {
    movie,
    score: Math.max(0, score),
    reason: reasons[0],
    matchesMood,
    matchesLikedTaste,
    matchesCollaborative,
  };
}

// Builds the request body for POST /ml/recommend. Nested objects
// (mood, viewing_history items, ratings items, all_ratings items) must
// use snake_case field names exactly — the Python schema only defines
// aliases on the top-level fields, not on nested models.
function _buildMLPayload(context, limit) {
  return {
    userId: context.userId,
    mood: context.mood
      ? {
          mood: context.mood.mood,
          suggested_genres: context.mood.suggestedGenres ?? [],
          logged_at: context.mood.loggedAt,
        }
      : null,
    favoriteGenres: context.preferences?.favoriteGenres ?? [],
    excludedGenres: context.preferences?.excludedGenres ?? [],
    preferredContentTypes: context.preferences?.preferredContentTypes ?? [],
    preferredLanguages: context.preferences?.preferredLanguages ?? [],
    viewingHistory: (context.viewingHistory ?? []).map((h) => ({
      movie_id: h.movieId ? String(h.movieId) : null,
      title: h.title,
      genres: h.genres ?? [],
      release_year: h.releaseYear,
      watched_at: h.watchedAt,
      completed: h.completed,
    })),
    ratings: (context.ratings ?? [])
      .filter((r) => r.rating != null)
      .map((r) => ({
        movie_id: r.movieId ? String(r.movieId) : null,
        title: r.title,
        genres: r.genres ?? [],
        rating: r.rating,
        liked: !!r.liked,
        disliked: !!r.disliked,
        feedback_text: r.feedbackText ?? null,
      })),
    likedMovieIds: context.likedMovieIds ?? [],
    dislikedMovieIds: context.dislikedMovieIds ?? [],
    allRatings: (context.allRatings ?? []).map((r) => ({
      user_id: r.userId,
      movie_id: r.movieId,
      rating: r.rating,
    })),
    limit,
  };
}

// Buckets the flat ML response by which signal(s) drove each
// recommendation, mirroring the personalized/moodBased/historyBased
// split the dashboard expects.
function _bucketMLRecommendations(items, limit) {
  const personalized = items.slice(0, limit);
  const personalizedIds = new Set(personalized.map((i) => String(i.movie_id ?? i.movieId ?? i.id)));

  const moodBased = items
    .filter((i) => i.signals?.matches_mood && !personalizedIds.has(String(i.movie_id ?? i.movieId ?? i.id)))
    .slice(0, limit);
  const historyBased = items
    .filter(
      (i) =>
        (i.signals?.matches_history || i.signals?.matches_rating || i.signals?.matches_collaborative) &&
        !personalizedIds.has(String(i.movie_id ?? i.movieId ?? i.id))
    )
    .slice(0, limit);

  return { personalized, moodBased, historyBased };
}

const RecommendationService = {
  async getRecommendations(userId, limit = ML_RECOMMEND_LIMIT) {
    const context = await RecommendationRepository.collectUserContext(userId);

    // Try the ML microservice first (TF-IDF content similarity + item-based
    // collaborative filtering, blended with mood/genre/popularity signals).
    // If it's unreachable or errors out, fall back to the in-process
    // rule-based scorer below so recommendations still work — this keeps the
    // feature resilient to the ML service being down or mid-deploy. The
    // fallback now also runs its own item-based collaborative filtering
    // (see collaborativeFilteringService.js) so that signal isn't lost
    // when the ML service is unavailable.
    try {
      const payload = _buildMLPayload(context, Math.max(ML_CANDIDATE_POOL, limit));
      const { data } = await mlClient.post('/ml/recommend', payload);
      const items = data?.recommendations ?? [];

      if (items.length > 0) {
        const buckets = _bucketMLRecommendations(items, limit);
        return toBucketedMLRecommendationsDTO(buckets);
      }
      // ML service responded but had nothing to recommend (e.g. empty
      // catalog) — fall through to the rule-based path below.
    } catch (err) {
      console.error('[RecommendationService] ML service call failed, falling back:', err.message);
    }

    return this._getRuleBasedRecommendations(userId, limit, context);
  },

  // The original in-process rule-based scorer, kept as a fallback for
  // when the ML microservice is unavailable.
  async _getRuleBasedRecommendations(userId, limit, context) {
    let candidates;
    try {
      const favGenres = context.preferences?.favoriteGenres ?? [];
      const moodGenres = context.mood
        ? MOOD_GENRE_MAP[context.mood.mood] ?? []
        : [];
      const targetGenres = [...new Set([...favGenres, ...moodGenres])];

      if (targetGenres.length > 0) {
        // Fetch mood/pref-relevant movies + a general pool to ensure variety
        const [targeted, general] = await Promise.all([
          MovieRepository.findByGenres(targetGenres),
          MovieRepository.findAll({ limit: 60 }).then(r => r.movies),
        ]);
        // Deduplicate by id
        const seen = new Set();
        candidates = [...targeted, ...general].filter(m => {
          const id = String(m._id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      } else {
        const { movies } = await MovieRepository.findAll({ limit: 60 });
        candidates = movies;
      }
    } catch {
      const { movies } = await MovieRepository.findAll({ limit: 60 });
      candidates = movies;
    }

    if (!candidates || candidates.length === 0) {
      return toFallbackRecommendationsDTO([], 'No movies in the database yet.');
    }

    // Build the collaborative filtering model once from the platform-wide
    // ratings (context.allRatings), then predict a score per candidate for
    // this user. Previously this data was fetched but only ever sent to
    // the Python ML service - the rule-based fallback ignored it entirely,
    // so collaborative signal disappeared whenever the ML service was down.
    const collabModel = new CollaborativeModel(context.allRatings ?? []);
    const knownRatings = {};
    for (const r of context.ratings ?? []) {
      if (r.movieId && r.rating != null) {
        knownRatings[String(r.movieId)] = r.rating;
      }
    }
    // Treat explicit likes/dislikes without a star rating as pseudo-ratings,
    // same as the Python engine, so they still feed the collaborative model.
    for (const mid of context.likedMovieIds ?? []) {
      if (!(String(mid) in knownRatings)) knownRatings[String(mid)] = 9.0;
    }
    for (const mid of context.dislikedMovieIds ?? []) {
      if (!(String(mid) in knownRatings)) knownRatings[String(mid)] = 2.0;
    }
    const candidateIds = candidates.map((m) => String(m._id ?? m.id));
    const collabScores = collabModel.predictScores(userId, knownRatings, candidateIds);

    // Score every candidate once, then bucket by which signal drove the match.
    // Previously this only ever returned a single flat list, so the
    // dashboard's "Because you're feeling <mood>" and "Because you enjoyed
    // titles like these" sections always rendered empty even when a mood
    // was set — there was nothing populating those buckets.
    const scoredAll = candidates
      .map(movie => scoreMovie(movie, { ...context, collabScores }))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const personalized = scoredAll.slice(0, limit);
    const personalizedIds = new Set(personalized.map(s => String(s.movie._id ?? s.movie.id)));

    const moodBased = context.mood?.mood
      ? scoredAll
          .filter(s => s.matchesMood && !personalizedIds.has(String(s.movie._id ?? s.movie.id)))
          .slice(0, limit)
      : [];

    const historyBased = scoredAll
      .filter(s => (s.matchesLikedTaste || s.matchesCollaborative) && !personalizedIds.has(String(s.movie._id ?? s.movie.id)))
      .slice(0, limit);

    return toBucketedRecommendationsDTO({ personalized, moodBased, historyBased });
  },
};

module.exports = RecommendationService;