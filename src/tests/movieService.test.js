// Unit tests for MovieService — the movie management API's core logic.

jest.mock('../repositories/movieRepository');

const MovieRepository = require('../repositories/movieRepository');
const MovieService = require('../services/movieService');
const { NotFoundError } = require('../errors/appError');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MovieService', () => {
  test('createMovie() creates a movie and returns it mapped through the DTO', async () => {
    const createdMovie = {
      _id: 'movie123',
      title: 'Kabhi Khushi Kabhie Gham',
      description: 'A family drama.',
      genres: ['Drama'],
      contentType: 'movie',
      rating: 'PG',
      releaseYear: 2001,
      language: 'Hindi',
      posterUrl: 'poster.jpg',
      trailerUrl: 'trailer.mp4',
      imdbId: 'tt0248126',
      averageScore: 8.1,
      moods: ['Nostalgic'],
      runtimeMinutes: 210,
      createdAt: new Date(),
    };
    MovieRepository.create.mockResolvedValue(createdMovie);

    const result = await MovieService.createMovie({
      title: 'Kabhi Khushi Kabhie Gham',
      genres: ['Drama'],
    });

    expect(MovieRepository.create).toHaveBeenCalledWith({
      title: 'Kabhi Khushi Kabhie Gham',
      genres: ['Drama'],
    });
    expect(result.id).toBe('movie123');
    expect(result.title).toBe('Kabhi Khushi Kabhie Gham');
    expect(result.runtimeMinutes).toBe(210);
  });

  test('getMovieById() throws NotFoundError when the movie does not exist', async () => {
    MovieRepository.findById.mockResolvedValue(null);

    await expect(MovieService.getMovieById('missing-id')).rejects.toThrow(NotFoundError);
    expect(MovieRepository.findById).toHaveBeenCalledWith('missing-id');
  });

  test('updateMovie() updates an existing movie and returns the mapped DTO', async () => {
    const updatedMovie = {
      _id: 'movie123',
      title: 'Updated Title',
      genres: ['Action'],
      moods: [],
      averageScore: 7.5,
      createdAt: new Date(),
    };
    MovieRepository.update.mockResolvedValue(updatedMovie);

    const result = await MovieService.updateMovie('movie123', { title: 'Updated Title' });

    expect(MovieRepository.update).toHaveBeenCalledWith('movie123', { title: 'Updated Title' });
    expect(result.id).toBe('movie123');
    expect(result.title).toBe('Updated Title');
  });

  test('deleteMovie() throws NotFoundError when deleting a movie that does not exist', async () => {
    MovieRepository.delete.mockResolvedValue(null);

    await expect(MovieService.deleteMovie('missing-id')).rejects.toThrow(NotFoundError);
    expect(MovieRepository.delete).toHaveBeenCalledWith('missing-id');
  });
});