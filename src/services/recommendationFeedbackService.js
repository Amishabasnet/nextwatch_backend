const RecommendationFeedbackRepository = require('../repositories/recommendationFeedbackRepository');
const MovieRepository = require('../repositories/movieRepository');
const { NotFoundError } = require('../errors/AppError');

const RecommendationFeedbackService = {
  async submitFeedback(userId, { movieId, clicked, liked, disliked, markedIrrelevant, irrelevantReason }) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) throw new NotFoundError('Movie not found');
    const data = {};
    if (clicked !== undefined) data.clicked = clicked;
    if (liked !== undefined) data.liked = liked;
    if (disliked !== undefined) data.disliked = disliked;
    if (markedIrrelevant !== undefined) data.markedIrrelevant = markedIrrelevant;
    if (irrelevantReason !== undefined) data.irrelevantReason = irrelevantReason;

    const feedback = await RecommendationFeedbackRepository.submitFeedback(userId, movieId, data);

    return {
      id: feedback._id,
      userId: feedback.userId,
      movieId: feedback.movieId,
      clicked: feedback.clicked,
      liked: feedback.liked,
      disliked: feedback.disliked,
      markedIrrelevant: feedback.markedIrrelevant,
      irrelevantReason: feedback.irrelevantReason || null,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    };
  },
};

module.exports = RecommendationFeedbackService;
