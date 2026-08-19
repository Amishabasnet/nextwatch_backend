// Unit tests for PreferenceService.

jest.mock('../repositories/preferenceRepository');

const PreferenceRepository = require('../repositories/preferenceRepository');
const PreferenceService = require('../services/preferenceService');
const { NotFoundError } = require('../errors/appError');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PreferenceService', () => {
  test('getPreferences() returns the stored preferences for a user', async () => {
    const prefs = { user: 'user123', favoriteGenres: ['Action', 'Comedy'] };
    PreferenceRepository.findByUser.mockResolvedValue(prefs);

    const result = await PreferenceService.getPreferences('user123');

    expect(PreferenceRepository.findByUser).toHaveBeenCalledWith('user123');
    expect(result).toBe(prefs);
  });

  test('getPreferences() throws NotFoundError when the user has no preferences set', async () => {
    PreferenceRepository.findByUser.mockResolvedValue(null);

    await expect(PreferenceService.getPreferences('user123')).rejects.toThrow(NotFoundError);
  });

  test('upsertPreferences() creates or updates preferences and returns the result', async () => {
    const updated = { user: 'user123', favoriteGenres: ['Sci-Fi'] };
    PreferenceRepository.upsert.mockResolvedValue(updated);

    const result = await PreferenceService.upsertPreferences('user123', { favoriteGenres: ['Sci-Fi'] });

    expect(PreferenceRepository.upsert).toHaveBeenCalledWith('user123', { favoriteGenres: ['Sci-Fi'] });
    expect(result).toBe(updated);
  });

  test('deletePreferences() deletes existing preferences and returns a success message', async () => {
    PreferenceRepository.findByUser.mockResolvedValue({ user: 'user123' });
    PreferenceRepository.delete.mockResolvedValue({ user: 'user123' });

    const result = await PreferenceService.deletePreferences('user123');

    expect(PreferenceRepository.delete).toHaveBeenCalledWith('user123');
    expect(result.message).toBe('Preferences deleted successfully');
  });

  test('deletePreferences() throws NotFoundError when preferences do not exist', async () => {
    PreferenceRepository.findByUser.mockResolvedValue(null);

    await expect(PreferenceService.deletePreferences('user123')).rejects.toThrow(NotFoundError);
    expect(PreferenceRepository.delete).not.toHaveBeenCalled();
  });
});