// Unit tests for RatingService.

jest.mock('../repositories/ratingRepository');
jest.mock('../repositories/movieRepository');

const RatingRepository = require('../repositories/ratingRepository');
const MovieRepository = require('../repositories/movieRepository');
const RatingService = require('../services/ratingService');
const { NotFoundError, ConflictError, ForbiddenError } = require('../errors/appError');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RatingService', () => {
  test('createRating() throws NotFoundError when the movie does not exist', async () => {
    MovieRepository.findById.mockResolvedValue(null);

    await expect(
      RatingService.createRating('user123', { movieId: 'missing-movie', rating: 5 })
    ).rejects.toThrow(NotFoundError);

    expect(RatingRepository.create).not.toHaveBeenCalled();
  });

  test('createRating() throws ConflictError when a star rating already exists and a new one is submitted', async () => {
    MovieRepository.findById.mockResolvedValue({ _id: 'movie123' });
    RatingRepository.findByUserAndMovie.mockResolvedValue({ _id: 'rating123', rating: 4 });

    await expect(
      RatingService.createRating('user123', { movieId: 'movie123', rating: 5 })
    ).rejects.toThrow(ConflictError);

    expect(RatingRepository.update).not.toHaveBeenCalled();
  });

  test('createRating() creates a new rating and re-syncs the movie score', async () => {
    MovieRepository.findById.mockResolvedValue({ _id: 'movie123' });
    RatingRepository.findByUserAndMovie.mockResolvedValue(null);
    RatingRepository.create.mockResolvedValue({
      _id: 'rating123',
      userId: 'user123',
      movieId: 'movie123',
      rating: 5,
      liked: false,
      disliked: false,
    });
    RatingRepository.getAverageForMovie.mockResolvedValue({ avg: 4.5 });
    MovieRepository.update.mockResolvedValue({});

    const result = await RatingService.createRating('user123', { movieId: 'movie123', rating: 5 });

    expect(RatingRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user123', movieId: 'movie123', rating: 5 })
    );
    expect(MovieRepository.update).toHaveBeenCalledWith('movie123', { averageScore: 4.5 });
    expect(result.id).toBe('rating123');
  });

  test('createRating() merges into an existing favorite-only record instead of erroring', async () => {
    MovieRepository.findById.mockResolvedValue({ _id: 'movie123' });
    RatingRepository.findByUserAndMovie.mockResolvedValue({ _id: 'rating123', rating: null, liked: true });
    RatingRepository.update.mockResolvedValue({ _id: 'rating123', rating: 5, liked: true });
    RatingRepository.getAverageForMovie.mockResolvedValue({ avg: 5 });
    MovieRepository.update.mockResolvedValue({});

    const result = await RatingService.createRating('user123', { movieId: 'movie123', rating: 5 });

    expect(RatingRepository.update).toHaveBeenCalledWith(
      'rating123',
      expect.objectContaining({ rating: 5 })
    );
    expect(result.id).toBe('rating123');
  });

  test('updateRating() throws ForbiddenError when the rating belongs to a different user', async () => {
    RatingRepository.findById.mockResolvedValue({
      _id: 'rating123',
      userId: { toString: () => 'someone-else' },
      movieId: 'movie123',
    });

    await expect(
      RatingService.updateRating('user123', 'rating123', { rating: 4 })
    ).rejects.toThrow(ForbiddenError);

    expect(RatingRepository.update).not.toHaveBeenCalled();
  });

  test('deleteRating() throws NotFoundError when the rating does not exist', async () => {
    RatingRepository.findById.mockResolvedValue(null);

    await expect(RatingService.deleteRating('user123', 'missing-id')).rejects.toThrow(NotFoundError);
    expect(RatingRepository.delete).not.toHaveBeenCalled();
  });
});