// Unit tests for MoodService.

jest.mock('../repositories/moodRepository');
jest.mock('../repositories/movieRepository');

const MoodRepository = require('../repositories/moodRepository');
const MovieRepository = require('../repositories/movieRepository');
const MoodService = require('../services/moodService');
const { NotFoundError } = require('../errors/appError');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MoodService', () => {
  test('logMood() logs a mood entry with genres suggested from the mood-to-genre map', async () => {
    const createdEntry = {
      _id: 'mood123',
      user: 'user123',
      mood: 'Happy',
      note: 'Feeling great today',
      suggestedGenres: ['Comedy', 'Animation', 'Adventure'],
    };
    MoodRepository.create.mockResolvedValue(createdEntry);

    const result = await MoodService.logMood('user123', { mood: 'Happy', note: 'Feeling great today' });

    expect(MoodRepository.create).toHaveBeenCalledWith({
      user: 'user123',
      mood: 'Happy',
      note: 'Feeling great today',
      suggestedGenres: ['Comedy', 'Animation', 'Adventure'],
    });
    expect(result).toBe(createdEntry);
  });

  test('getLatestMood() throws NotFoundError when the user has never logged a mood', async () => {
    MoodRepository.findLatestByUser.mockResolvedValue(null);

    await expect(MoodService.getLatestMood('user123')).rejects.toThrow(NotFoundError);
  });

  test('getRecommendationsByMood() throws NotFoundError when no mood has been logged yet', async () => {
    MoodRepository.findLatestByUser.mockResolvedValue(null);

    await expect(MoodService.getRecommendationsByMood('user123')).rejects.toThrow(NotFoundError);
    expect(MovieRepository.findByMoods).not.toHaveBeenCalled();
  });

  test('getRecommendationsByMood() falls back to genre-based movies when no mood-tagged movies exist', async () => {
    MoodRepository.findLatestByUser.mockResolvedValue({
      mood: 'Romantic',
      suggestedGenres: ['Romance', 'Drama'],
    });
    MovieRepository.findByMoods.mockResolvedValue([]);
    const genreMovies = [{ _id: 'm2', title: 'Love Story' }];
    MovieRepository.findByGenres.mockResolvedValue(genreMovies);

    const result = await MoodService.getRecommendationsByMood('user123');

    expect(MovieRepository.findByGenres).toHaveBeenCalledWith(['Romance', 'Drama']);
    expect(result.recommendations).toBe(genreMovies);
  });

  test('deleteMood() throws NotFoundError when the mood entry belongs to a different user', async () => {
    MoodRepository.findById.mockResolvedValue({ _id: 'mood123', user: { toString: () => 'someone-else' } });

    await expect(MoodService.deleteMood('user123', 'mood123')).rejects.toThrow(NotFoundError);
    expect(MoodRepository.delete).not.toHaveBeenCalled();
  });
});