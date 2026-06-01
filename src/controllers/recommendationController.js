const Movie = require('../models/Movie');
const Preference = require('../models/Preference');
const Mood = require('../models/Mood');
const WatchHistory = require('../models/WatchHistory');

/**
 * @desc    Get personalized hybrid movie recommendations
 * @route   GET /api/recommendations
 * @access  Private
 */
const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Fetch user watch history (populate movie details to check similarity)
    const watchHistory = await WatchHistory.find({ user: userId }).populate('movie');
    const watchedMovieIds = watchHistory
      .filter((h) => h.movie)
      .map((h) => h.movie._id.toString());

    // 2. Fetch user preferences
    const preferences = await Preference.findOne({ user: userId });

    // 3. Fetch latest logged mood
    const latestMoodLog = await Mood.findOne({ user: userId }).sort({ createdAt: -1 });
    const latestMood = latestMoodLog ? latestMoodLog.mood : null;

    // 4. Build candidate movie query
    // Exclude already watched movies
    const candidateQuery = {
      _id: { $nin: watchedMovieIds },
    };

    // Exclude disliked genres
    if (preferences && preferences.dislikedGenres && preferences.dislikedGenres.length > 0) {
      // Create case-insensitive regex for disliked genres to be safe
      const dislikedRegexes = preferences.dislikedGenres.map((g) => new RegExp(`^${g}$`, 'i'));
      candidateQuery.genre = { $nin: dislikedRegexes };
    }

    // Retrieve all candidates
    const candidates = await Movie.find(candidateQuery);

    // If no candidate movies exist, return empty array
    if (candidates.length === 0) {
      return res.status(200).json([]);
    }

    // 5. Score candidates
    const scoredCandidates = candidates.map((movie) => {
      let score = 0;

      // Rule A: Prioritize highly rated movies (using rating directly as base score)
      score += movie.rating || 0;

      // Rule B: Match current mood (+5 points)
      if (latestMood && movie.moodCategory && movie.moodCategory.toLowerCase() === latestMood.toLowerCase()) {
        score += 5;
      }

      // Rule C: Match preferred genres (+2 points per matching genre)
      if (preferences && preferences.genrePreferences && preferences.genrePreferences.length > 0) {
        const preferredGenresLower = preferences.genrePreferences.map((g) => g.toLowerCase());
        movie.genre.forEach((genre) => {
          if (preferredGenresLower.includes(genre.toLowerCase())) {
            score += 2;
          }
        });
      }

      // Rule D: Similarity to previously watched movies (genres + actors + directors)
      if (watchHistory.length > 0) {
        watchHistory.forEach((historyItem) => {
          const watchedMovie = historyItem.movie;
          if (watchedMovie) {
            // Genre overlap similarity (+1 point per overlapping genre)
            if (watchedMovie.genre && movie.genre) {
              const watchedGenresLower = watchedMovie.genre.map((g) => g.toLowerCase());
              movie.genre.forEach((g) => {
                if (watchedGenresLower.includes(g.toLowerCase())) {
                  score += 1;
                }
              });
            }

            // Actor overlap similarity (+2 points per overlapping actor)
            if (watchedMovie.actors && movie.actors) {
              const watchedActorsLower = watchedMovie.actors.map((a) => a.toLowerCase());
              movie.actors.forEach((a) => {
                if (watchedActorsLower.includes(a.toLowerCase())) {
                  score += 2;
                }
              });
            }

            // Director overlap similarity (+2 points if same director)
            if (
              watchedMovie.director &&
              movie.director &&
              watchedMovie.director.toLowerCase() === movie.director.toLowerCase()
            ) {
              score += 2;
            }
          }
        });
      }

      return { movie, score };
    });

    // 6. Sort by score descending and return top 10 recommendations
    scoredCandidates.sort((a, b) => b.score - a.score);
    const recommendations = scoredCandidates.slice(0, 10).map((sc) => sc.movie);

    // If all scores are 0 (e.g. new user with no preferences or history), fallback to top rated candidates
    const allZero = scoredCandidates.every((sc) => sc.score === 0);
    if (allZero) {
      const fallback = await Movie.find(candidateQuery).sort({ rating: -1 }).limit(10);
      return res.status(200).json(fallback);
    }

    res.status(200).json(recommendations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
};
