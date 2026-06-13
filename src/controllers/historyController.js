const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const historySvc = require('../services/historyService');

// Record a new movie interaction for the logged-in user
const recordEvent = asyncHandler(async (req, res) => {
  const event = await historySvc.recordEvent({
    userId: req.user._id,
    movieId: req.body.movieId,
    actionType: req.body.actionType,
    timestamp: req.body.timestamp,
    metadata: req.body.metadata,
  });

  res.status(201).json({
    success: true,
    message: `"${req.body.actionType}" event recorded successfully.`,
    data: {
      event: {
        _id: event._id,
        userId: event.userId,
        movieId: event.movieId,
        actionType: event.actionType,
        timestamp: event.timestamp,
        metadata: event.metadata,
        createdAt: event.createdAt,
      },
    },
  });
});

// Get a user's history with optional filters and pagination
const getUserHistory = asyncHandler(async (req, res, next) => {
  // Regular users can only view their own history.
  // An admin is allowed to view any user's history.
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to view this history.', 403)
    );
  }

  const { events, total, page, limit, actionSummary } =
    await historySvc.getHistory(
      req.params.userId,
      req.query
    );

  // Calculate the number of pages available
  const totalPages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    message:
      total > 0
        ? 'Viewing history retrieved successfully.'
        : 'No history found for this user.',
    data: {
      results: events.map((event) => event.toSummary()),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },

      // Show the total activity for each type of movie interaction
      actionSummary,
    },
  });
});

// Delete all history or only events of a selected action type
const clearUserHistory = asyncHandler(async (req, res, next) => {
  // Regular users can only delete their own history.
  // An admin is allowed to delete any user's history.
  if (
    req.user.role !== 'admin' &&
    req.user._id.toString() !== req.params.userId
  ) {
    return next(
      new AppError('You are not authorised to delete this history.', 403)
    );
  }

  const { deletedCount } = await historySvc.clearHistory(
    req.params.userId,
    {
      actionType: req.query.actionType,
    }
  );

  // Describe whether all history or one type of event was removed
  const scope = req.query.actionType
    ? `"${req.query.actionType}" events`
    : 'viewing history';

  res.status(200).json({
    success: true,
    message: `${deletedCount} ${scope} record${
      deletedCount === 1 ? '' : 's'
    } deleted successfully.`,
    data: {
      deletedCount,
    },
  });
});

module.exports = {
  recordEvent,
  getUserHistory,
  clearUserHistory,
};