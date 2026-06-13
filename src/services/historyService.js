const { History, ACTION_TYPES } = require('../models/History');
const Movie = require('../models/Movie');
const AppError = require('../utils/AppError');

// Movie details included when history records are returned
const MOVIE_POPULATE = {
  path: 'movieId',
  select:
    'title genres releaseYear duration rating director language posterUrl moodTags status',
};

// Save a new movie interaction for a user
const recordEvent = async ({
  userId,
  movieId,
  actionType,
  timestamp,
  metadata,
}) => {
  // Make sure the selected movie exists before recording the event
  const movieExists = await Movie.exists({
    _id: movieId,
  });

  if (!movieExists) {
    throw new AppError('Movie not found.', 404);
  }

  // Create a new history entry
  // Repeated events are allowed because they can improve recommendations
  const event = await History.create({
    userId,
    movieId,
    actionType,

    // Use the submitted time and metadata only when they are provided
    ...(timestamp !== undefined && { timestamp }),
    ...(metadata !== undefined && { metadata }),
  });

  return event;
};

// Get a user's history with optional filters and pagination
const getHistory = async (userId, query = {}) => {
  const {
    actionType,
    movieId,
    from,
    to,
    page = 1,
    limit = 20,
  } = query;

  // Start the filter with the selected user
  const filter = {
    userId,
  };

  // Apply the optional history filters
  if (actionType) {
    filter.actionType = actionType;
  }

  if (movieId) {
    filter.movieId = movieId;
  }

  // Filter events within the selected date range
  if (from || to) {
    filter.timestamp = {};

    if (from) {
      filter.timestamp.$gte = new Date(from);
    }

    if (to) {
      filter.timestamp.$lte = new Date(to);
    }
  }

  // Prepare the pagination values
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(
    Math.max(1, Number(limit)),
    100
  );
  const skip = (pageNum - 1) * limitNum;

  // Get the history, total count and activity summary at the same time
  const [events, total, rawSummary] = await Promise.all([
    History.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate(MOVIE_POPULATE)
      .select('-__v'),

    History.countDocuments(filter),

    // Count every action type from the user's complete history
    History.aggregate([
      {
        $match: {
          userId: filter.userId,
        },
      },
      {
        $group: {
          _id: '$actionType',
          count: {
            $sum: 1,
          },
          lastAt: {
            $max: '$timestamp',
          },
        },
      },
    ]),
  ]);

  // Create a summary that always includes every supported action type
  const actionSummary = ACTION_TYPES.reduce((summary, type) => {
    const found = rawSummary.find(
      (record) => record._id === type
    );

    summary[type] = {
      count: found?.count ?? 0,
      lastAt: found?.lastAt ?? null,
    };

    return summary;
  }, {});

  return {
    events,
    total,
    page: pageNum,
    limit: limitNum,
    actionSummary,
  };
};

// Delete all history or only one selected action type
const clearHistory = async (
  userId,
  { actionType } = {}
) => {
  const filter = {
    userId,
  };

  // Delete only the selected type when one is provided
  if (actionType) {
    filter.actionType = actionType;
  }

  const result = await History.deleteMany(filter);

  return {
    deletedCount: result.deletedCount,
  };
};

module.exports = {
  recordEvent,
  getHistory,
  clearHistory,
};