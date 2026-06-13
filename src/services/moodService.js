const MoodRepository = require('../repositories/moodRepository');
const MovieRepository = require('../repositories/movieRepository');
const { NotFoundError } = require('../errors/AppError');

// Maps each mood to suggested genres for movie recommendations
const MOOD_GENRE_MAP = {
  Happy: ['Comedy', 'Animation', 'Adventure'],
  Sad: ['Drama', 'Romance'],
  Excited: ['Action', 'Adventure', 'Sci-Fi'],
  Relaxed: ['Documentary', 'Animation', 'Comedy'],
  Scared: ['Horror', 'Thriller', 'Mystery'],
  Romantic: ['Romance', 'Drama'],
  Motivated: ['Action', 'Documentary', 'Adventure'],
  Bored: ['Comedy', 'Action', 'Thriller'],
  Nostalgic: ['Drama', 'Romance', 'Animation'],
};

const MoodService = {
  async logMood(userId, { mood, note }) {
    const suggestedGenres = MOOD_GENRE_MAP[mood] || [];
    const entry = await MoodRepository.create({ user: userId, mood, note, suggestedGenres });
    return entry;
  },

  async getMoodHistory(userId) {
    return MoodRepository.findByUser(userId);
  },

  async getLatestMood(userId) {
    const mood = await MoodRepository.findLatestByUser(userId);
    if (!mood) {
      throw new NotFoundError('No mood logged yet');
    }
    return mood;
  },

  async getRecommendationsByMood(userId) {
    const mood = await MoodRepository.findLatestByUser(userId);
    if (!mood) {
      throw new NotFoundError('No mood logged yet. Please log your current mood first.');
    }

    const movies = await MovieRepository.findByMoods([mood.mood]);
    // Fallback: use suggested genres if no mood-tagged movies
    const results =
      movies.length > 0
        ? movies
        : await MovieRepository.findByGenres(mood.suggestedGenres);

    return { mood: mood.mood, suggestedGenres: mood.suggestedGenres, recommendations: results };
  },

  async deleteMood(userId, moodId) {
    const mood = await MoodRepository.findById(moodId);
    if (!mood || mood.user.toString() !== userId.toString()) {
      throw new NotFoundError('Mood entry not found');
    }
    await MoodRepository.delete(moodId);
    return { message: 'Mood entry deleted' };
  },
};

module.exports = MoodService;
