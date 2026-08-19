// Unit tests for WatchlistService.

jest.mock('../repositories/watchlistRepository');
jest.mock('../repositories/movieRepository');

const WatchlistRepository = require('../repositories/watchlistRepository');
const MovieRepository = require('../repositories/movieRepository');
const WatchlistService = require('../services/watchlistService');
const { NotFoundError, ConflictError } = require('../errors/appError');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WatchlistService', () => {
  test('addToWatchlist() throws NotFoundError when the movie does not exist', async () => {
    MovieRepository.findById.mockResolvedValue(null);

    await expect(
      WatchlistService.addToWatchlist('user123', { movieId: 'missing-movie' })
    ).rejects.toThrow(NotFoundError);

    expect(WatchlistRepository.create).not.toHaveBeenCalled();
  });

  test('addToWatchlist() throws ConflictError when the movie is already on the watchlist', async () => {
    MovieRepository.findById.mockResolvedValue({ _id: 'movie123' });
    WatchlistRepository.findOne.mockResolvedValue({ _id: 'existing-entry' });

    await expect(
      WatchlistService.addToWatchlist('user123', { movieId: 'movie123' })
    ).rejects.toThrow(ConflictError);

    expect(WatchlistRepository.create).not.toHaveBeenCalled();
  });

  test('addToWatchlist() creates a new entry and returns the mapped DTO', async () => {
    MovieRepository.findById.mockResolvedValue({ _id: 'movie123' });
    WatchlistRepository.findOne.mockResolvedValue(null);
    WatchlistRepository.create.mockResolvedValue({
      _id: 'watchlist123',
      movie: 'movie123',
      notes: 'Watch this weekend',
      priority: 'high',
      createdAt: new Date(),
    });

    const result = await WatchlistService.addToWatchlist('user123', {
      movieId: 'movie123',
      notes: 'Watch this weekend',
      priority: 'high',
    });

    expect(WatchlistRepository.create).toHaveBeenCalledWith({
      user: 'user123',
      movie: 'movie123',
      notes: 'Watch this weekend',
      priority: 'high',
    });
    expect(result.id).toBe('watchlist123');
    expect(result.priority).toBe('high');
  });

  test('getWatchlist() returns paginated results mapped through the list DTO', async () => {
    WatchlistRepository.findByUser.mockResolvedValue({
      records: [{ _id: 'w1', movie: 'movie123', createdAt: new Date() }],
      total: 1,
    });

    const result = await WatchlistService.getWatchlist('user123', { page: 1, limit: 10 });

    expect(WatchlistRepository.findByUser).toHaveBeenCalledWith('user123', { page: 1, limit: 10 });
    expect(result.watchlist).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  test('removeFromWatchlist() throws NotFoundError when the entry does not exist', async () => {
    WatchlistRepository.delete.mockResolvedValue(null);

    await expect(
      WatchlistService.removeFromWatchlist('user123', 'missing-movie')
    ).rejects.toThrow(NotFoundError);
  });

  test('clearWatchlist() clears all entries and returns a success message', async () => {
    WatchlistRepository.clearAll.mockResolvedValue({});

    const result = await WatchlistService.clearWatchlist('user123');

    expect(WatchlistRepository.clearAll).toHaveBeenCalledWith('user123');
    expect(result.message).toBe('Watchlist cleared');
  });
});