const Movie = require('../models/Movie');

// Get movie recommendations based on the user's favourite genres
const getPersonalisedRecommendations = async (user, limit = 20) => {
  const genres = user.preferences?.genres || [];
  const watchlistIds = user.watchlist || [];

  const filter = {
    // Do not recommend movies that are already in the user's watchlist
    _id: { $nin: watchlistIds },
  };

  // Filter by preferred genres when the user has selected any
  if (genres.length) {
    filter.genres = { $in: genres };
  }

  // Show the highest-rated and most-reviewed movies first
  return Movie.find(filter)
    .sort('-rating.average -rating.count')
    .limit(limit);
};

// Find other movies that share genres with the selected movie
const getSimilarMovies = async (movie, limit = 10) => {
  return Movie.find({
    // Do not include the selected movie in the results
    _id: { $ne: movie._id },

    // Match movies that have at least one similar genre
    genres: { $in: movie.genres },
  })
    .sort('-rating.average')
    .limit(limit);
};

// Get popular movies with enough ratings from users
const getTrendingMovies = async (limit = 20, minVotes = 10) => {
  return Movie.find({
    // Only include movies that have received the minimum number of ratings
    'rating.count': { $gte: minVotes },
  })
    .sort('-rating.average -createdAt')
    .limit(limit);
};

module.exports = {
  getPersonalisedRecommendations,
  getSimilarMovies,
  getTrendingMovies,
};