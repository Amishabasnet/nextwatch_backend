const WatchlistRepository = require('../repositories/watchlistRepository');
const MovieRepository = require('../repositories/movieRepository');
const { toWatchlistEntryDTO, toWatchlistListDTO } = require('../dtos/watchlist.dto');
const { NotFoundError, ConflictError } = require('../errors/AppError');
const { paginationMeta } = require('../types/express.types');

const WatchlistService = {
  async addToWatchlist(userId, { movieId, notes, priority }) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) throw new NotFoundError('Movie not found');

    const existing = await WatchlistRepository.findOne(userId, movieId);
    if (existing) {
      throw new ConflictError('Movie is already on your watchlist');
    }

    const entry = await WatchlistRepository.create({
      user: userId,
      movie: movieId,
      notes,
      priority,
    });

    return toWatchlistEntryDTO(entry);
  },

  async getWatchlist(userId, { page = 1, limit = 10 } = {}) {
    const { records, total } = await WatchlistRepository.findByUser(userId, { page, limit });
    return {
      watchlist: toWatchlistListDTO(records),
      meta: paginationMeta(page, limit, total),
    };
  },

  async removeFromWatchlist(userId, movieId) {
    const entry = await WatchlistRepository.delete(userId, movieId);
    if (!entry) throw new NotFoundError('Watchlist entry not found');
    return { message: 'Removed from watchlist' };
  },

  async clearWatchlist(userId) {
    await WatchlistRepository.clearAll(userId);
    return { message: 'Watchlist cleared' };
  },
};

module.exports = WatchlistService;
