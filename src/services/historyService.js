const HistoryRepository = require('../repositories/historyRepository');
const MovieRepository = require('../repositories/movieRepository');
const { toHistoryDTO, toHistoryListDTO } = require('../dtos/history.dto');
const { NotFoundError, ConflictError } = require('../errors/AppError');
const { paginationMeta } = require('../types/express.types');

const HistoryService = {
  async addToHistory(userId, { movieId, rating, review, completed, watchedAt }) {
    const movie = await MovieRepository.findById(movieId);
    if (!movie) throw new NotFoundError('Movie not found');

    const existing = await HistoryRepository.findOne(userId, movieId);
    if (existing) {
      throw new ConflictError('Movie already in watch history. Use update to modify it.');
    }

    const record = await HistoryRepository.create({
      user: userId,
      movie: movieId,
      rating,
      review,
      completed,
      watchedAt: watchedAt || new Date(),
    });

    return toHistoryDTO(record);
  },

  async getHistory(userId, { page = 1, limit = 10 } = {}) {
    const { records, total } = await HistoryRepository.findByUser(userId, { page, limit });
    return {
      history: toHistoryListDTO(records),
      meta: paginationMeta(page, limit, total),
    };
  },

  async updateHistoryEntry(userId, movieId, data) {
    const record = await HistoryRepository.update(userId, movieId, data);
    if (!record) throw new NotFoundError('History entry not found');
    return toHistoryDTO(record);
  },

  async removeFromHistory(userId, movieId) {
    const record = await HistoryRepository.delete(userId, movieId);
    if (!record) throw new NotFoundError('History entry not found');
    return { message: 'Removed from watch history' };
  },

  async clearHistory(userId) {
    await HistoryRepository.clearAll(userId);
    return { message: 'Watch history cleared' };
  },
};

module.exports = HistoryService;
