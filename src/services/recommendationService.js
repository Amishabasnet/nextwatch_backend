const RecommendationRepository = require('../repositories/recommendationRepository');
const MovieRepository           = require('../repositories/movieRepository');
const {
  toRecommendationsResponseDTO,
  toFallbackRecommendationsDTO,
  toBucketedRecommendationsDTO,
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

const ML_RECOMMEND_LIMIT = 10;

function scoreMovie(movie, context) {
  let score = 0;
  const reasons = [];
  let matchesMood = false;
  let matchesLikedTaste = false;

  const {
    mood,
    preferences = {},
    viewingHistory = [],
    ratings = [],
    likedMovieIds = [],
    dislikedMovieIds = [],
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

  if (prefLangs.length > 0 && prefLangs.includes(movie.language)) {
    score += 5;
  }
  if (prefTypes.length > 0 && prefTypes.includes(movie.contentType)) {
    score += 5;
  }

  if (reasons.length === 0) {
    reasons.push('Trending in our catalogue');
  }

  return { movie, score: Math.max(0, score), reason: reasons[0], matchesMood, matchesLikedTaste };
}

const RecommendationService = {
  async getRecommendations(userId, limit = ML_RECOMMEND_LIMIT) {
    const context = await RecommendationRepository.collectUserContext(userId);

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

    // Score every candidate once, then bucket by which signal drove the match.
    // Previously this only ever returned a single flat list, so the
    // dashboard's "Because you're feeling <mood>" and "Because you enjoyed
    // titles like these" sections always rendered empty even when a mood
    // was set — there was nothing populating those buckets.
    const scoredAll = candidates
      .map(movie => scoreMovie(movie, context))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const personalized = scoredAll.slice(0, limit);

    const moodBased = context.mood?.mood
      ? scoredAll.filter(s => s.matchesMood).slice(0, limit)
      : [];

    const historyBased = scoredAll.filter(s => s.matchesLikedTaste).slice(0, limit);

    return toBucketedRecommendationsDTO(
      { personalized, moodBased, historyBased },
      'Personalised for you'
    );
  },
};

module.exports = RecommendationService;