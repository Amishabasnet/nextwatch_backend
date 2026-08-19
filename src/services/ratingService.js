const RatingRepository = require('../repositories/ratingRepository');
const MovieRepository = require('../repositories/movieRepository');
const { toRatingDTO, toRatingListDTO, toMovieRatingsSummaryDTO } = require('../dtos/rating.dto');
const { NotFoundError, ConflictError, ForbiddenError } = require('../errors/appError');

const RatingService = {
  async createRating(userId, { movieId, rating, liked, disliked, feedbackText }) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) throw new NotFoundError('Movie not found');

    const existing = await RatingRepository.findByUserAndMovie(userId, movieId);
    if (existing) {
      // A record can already exist purely from favoriting (liked/disliked
      // set, no star score yet). Rather than hard-failing every time two
      // entry points (Favorite button + Rate form) touch the same
      // user+movie pair, merge the new fields into the existing document
      // instead of erroring — this only rejects when the caller is trying
      // to overwrite an already-submitted star rating outright.
      if (existing.rating != null && rating != null) {
        throw new ConflictError(
          'You have already rated this movie. Use PUT /api/ratings/:id to update it.'
        );
      }

      const merged = await RatingRepository.update(existing._id, {
        ...(rating !== undefined ? { rating } : {}),
        ...(liked !== undefined ? { liked } : {}),
        ...(disliked !== undefined ? { disliked } : {}),
        ...(feedbackText !== undefined ? { feedbackText } : {}),
      });

      if (rating !== undefined) await RatingService._syncMovieScore(movieId);
      return toRatingDTO(merged);
    }

    const newRating = await RatingRepository.create({
      userId,
      movieId,
      rating,
      liked: liked || false,
      disliked: disliked || false,
      feedbackText,
    });

    // Keep Movie.averageScore in sync
    if (rating != null) await RatingService._syncMovieScore(movieId);

    return toRatingDTO(newRating);
  },

  async getRatingsByMovie(movieId) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) throw new NotFoundError('Movie not found');

    const ratings = await RatingRepository.findByMovie(movieId);
    return toMovieRatingsSummaryDTO(ratings);
  },

  async getRatingsByUser(userId) {
    const ratings = await RatingRepository.findByUser(userId);
    return toRatingListDTO(ratings);
  },

  async updateRating(requestingUserId, ratingId, updates) {
    const rating = await RatingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating not found');

    if (rating.userId.toString() !== requestingUserId.toString()) {
      throw new ForbiddenError('You can only update your own ratings');
    }

    const updated = await RatingRepository.update(ratingId, updates);

    // Re-sync movie score if the numeric rating changed
    if (updates.rating !== undefined) {
      await RatingService._syncMovieScore(rating.movieId);
    }

    return toRatingDTO(updated);
  },

  async deleteRating(requestingUserId, ratingId) {
    const rating = await RatingRepository.findById(ratingId);
    if (!rating) throw new NotFoundError('Rating not found');

    if (rating.userId.toString() !== requestingUserId.toString()) {
      throw new ForbiddenError('You can only delete your own ratings');
    }

    await RatingRepository.delete(ratingId);

    // Re-sync movie score after deletion
    await RatingService._syncMovieScore(rating.movieId);

    return { message: 'Rating deleted successfully' };
  },

  async getImplicitPreferences(userId) {
    const highScored = await RatingRepository.getHighScoredRatings(userId);
    const likedIds = await RatingRepository.getLikedMovieIds(userId);
    const dislikedIds = await RatingRepository.getDislikedMovieIds(userId);

    // Count genre frequency across well-rated movies
    const genreFrequency = {};
    for (const r of highScored) {
      if (r.movieId && r.movieId.genres) {
        for (const genre of r.movieId.genres) {
          genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
        }
      }
    }

    const preferredGenres = Object.entries(genreFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    return {
      preferredGenres,
      likedMovieIds: likedIds,
      dislikedMovieIds: dislikedIds,
      totalRatingsAnalyzed: highScored.length,
    };
  },

  async _syncMovieScore(movieId) {
    const { avg } = await RatingRepository.getAverageForMovie(movieId);
    const rounded = Math.round(avg * 10) / 10;
    await MovieRepository.update(movieId, { averageScore: rounded });
  },
};

module.exports = RatingService;
