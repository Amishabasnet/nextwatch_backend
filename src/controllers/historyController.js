const WatchHistory = require('../models/WatchHistory');
const Movie = require('../models/Movie');

/**
 * @desc    Add movie to watch history
 * @route   POST /api/history
 * @access  Private
 */
const addHistoryEntry = async (req, res, next) => {
  try {
    const { movieId, watchDuration, completedStatus, deviceType } = req.body;

    // Validation
    if (!movieId || watchDuration === undefined || completedStatus === undefined || !deviceType) {
      return res.status(400).json({
        message: 'Please provide all required fields: movieId, watchDuration, completedStatus, deviceType',
      });
    }

    // Verify movie exists
    const movieExists = await Movie.findById(movieId);
    if (!movieExists) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const historyEntry = await WatchHistory.create({
      user: req.user._id,
      movie: movieId,
      watchDuration: Number(watchDuration),
      completedStatus: Boolean(completedStatus),
      deviceType: String(deviceType).trim(),
    });

    res.status(201).json(historyEntry);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user watch history
 * @route   GET /api/history
 * @access  Private
 */
const getHistory = async (req, res, next) => {
  try {
    const history = await WatchHistory.find({ user: req.user._id })
      .populate('movie')
      .sort({ watchedDate: -1 });

    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

const deleteHistoryEntry = async (req, res, next) => {
  try {
    const historyEntry = await WatchHistory.findById(req.params.id);
    if (!historyEntry) {
      return res.status(404).json({ message: 'History entry not found' });
    }

    // Ownership check
    if (historyEntry.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this history entry' });
    }

    await historyEntry.deleteOne();
    res.status(200).json({ message: 'History entry removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addHistoryEntry,
  getHistory,
  deleteHistoryEntry,
};
