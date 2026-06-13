const toRatingDTO = (rating) => ({
  id: rating._id,
  userId: rating.userId,
  movieId: rating.movieId,
  rating: rating.rating,
  liked: rating.liked,
  disliked: rating.disliked,
  feedbackText: rating.feedbackText || null,
  createdAt: rating.createdAt,
  updatedAt: rating.updatedAt,
});

const toRatingListDTO = (ratings) => ratings.map(toRatingDTO);

const toMovieRatingsSummaryDTO = (ratings) => {
  if (!ratings.length) {
    return {
      totalRatings: 0,
      averageRating: null,
      likedCount: 0,
      dislikedCount: 0,
      ratings: [],
    };
  }

  const total = ratings.length;
  const average = ratings.reduce((sum, r) => sum + r.rating, 0) / total;
  const likedCount = ratings.filter((r) => r.liked).length;
  const dislikedCount = ratings.filter((r) => r.disliked).length;

  return {
    totalRatings: total,
    averageRating: Math.round(average * 10) / 10,
    likedCount,
    dislikedCount,
    ratings: toRatingListDTO(ratings),
  };
};

module.exports = { toRatingDTO, toRatingListDTO, toMovieRatingsSummaryDTO };
