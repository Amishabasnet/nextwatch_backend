const Feedback = require('../models/Feedback');
const Movie = require('../models/Movie');

/**
 * @desc    Submit user feedback (recommendation likes/dislikes or general comments)
 * @route   POST /api/feedback
 * @access  Private
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { type, movieId, comment } = req.body;

    if (!type) {
      return res.status(400).json({ message: 'Please provide feedback type' });
    }

    const allowedTypes = ['recommendation_like', 'recommendation_dislike', 'general'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: 'Feedback type must be one of: recommendation_like, recommendation_dislike, general',
      });
    }

    const feedbackData = {
      user: req.user._id,
      type,
    };

    if (type === 'recommendation_like' || type === 'recommendation_dislike') {
      if (!movieId) {
        return res.status(400).json({ message: 'movieId is required for recommendation feedback' });
      }
      const movieExists = await Movie.findById(movieId);
      if (!movieExists) {
        return res.status(404).json({ message: 'Movie not found' });
      }
      feedbackData.movie = movieId;
    }

    if (type === 'general') {
      if (!comment || typeof comment !== 'string' || comment.trim() === '') {
        return res.status(400).json({ message: 'comment is required for general feedback' });
      }
      feedbackData.comment = comment.trim();
    }

    const feedback = await Feedback.create(feedbackData);

    res.status(201).json(feedback);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
};
