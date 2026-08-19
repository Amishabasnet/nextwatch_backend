// Unit tests for HistoryService.

jest.mock('../repositories/historyRepository');
jest.mock('../repositories/movieRepository');

const HistoryRepository = require('../repositories/historyRepository');
const MovieRepository = require('../repositories/movieRepository');
const HistoryService = require('../services/historyService');
const { NotFoundError, ConflictError } = require('../errors/appError');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HistoryService', () => {
  test('addToHistory() throws NotFoundError when the movie does not exist', async () => {
    MovieRepository.findById.mockResolvedValue(null);

    await expect(
      HistoryService.addToHistory('user123', { movieId: 'missing-movie' })
    ).rejects.toThrow(NotFoundError);

    expect(HistoryRepository.create).not.toHaveBeenCalled();
  });

  test('addToHistory() throws ConflictError when the movie is already in the user\'s history', async () => {
    MovieRepository.findById.mockResolvedValue({ _id: 'movie123' });
    HistoryRepository.findOne.mockResolvedValue({ _id: 'existing-entry' });

    await expect(
      HistoryService.addToHistory('user123', { movieId: 'movie123' })
    ).rejects.toThrow(ConflictError);

    expect(HistoryRepository.create).not.toHaveBeenCalled();
  });

  test('addToHistory() creates a new history entry and returns the mapped DTO', async () => {
    MovieRepository.findById.mockResolvedValue({ _id: 'movie123' });
    HistoryRepository.findOne.mockResolvedValue(null);
    const createdRecord = {
      _id: 'history123',
      movie: 'movie123',
      rating: 4,
      review: 'Loved it',
      completed: true,
      watchedAt: new Date('2026-01-01'),
      createdAt: new Date(),
    };
    HistoryRepository.create.mockResolvedValue(createdRecord);

    const result = await HistoryService.addToHistory('user123', {
      movieId: 'movie123',
      rating: 4,
      review: 'Loved it',
      completed: true,
      watchedAt: new Date('2026-01-01'),
    });

    expect(HistoryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: 'user123', movie: 'movie123', rating: 4 })
    );
    expect(result.id).toBe('history123');
    expect(result.rating).toBe(4);
  });

  test('getHistory() returns paginated history mapped through the list DTO', async () => {
    HistoryRepository.findByUser.mockResolvedValue({
      records: [{ _id: 'h1', movie: 'movie123', watchedAt: new Date(), createdAt: new Date() }],
      total: 1,
    });

    const result = await HistoryService.getHistory('user123', { page: 1, limit: 10 });

    expect(HistoryRepository.findByUser).toHaveBeenCalledWith('user123', { page: 1, limit: 10 });
    expect(result.history).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  test('removeFromHistory() throws NotFoundError when the entry does not exist', async () => {
    HistoryRepository.delete.mockResolvedValue(null);

    await expect(
      HistoryService.removeFromHistory('user123', 'missing-movie')
    ).rejects.toThrow(NotFoundError);
  });
});