const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'Western',
];

const MOODS = [
  'Happy', 'Sad', 'Excited', 'Relaxed', 'Scared',
  'Romantic', 'Motivated', 'Bored', 'Nostalgic',
];

const CONTENT_TYPES = ['movie', 'tvshow', 'documentary', 'anime'];

const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-MA', 'TV-14', 'TV-PG'];

// Account lockout
const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCK_TIME_MS       = Number(process.env.LOCK_TIME_MINUTES || 15) * 60 * 1000;

module.exports = {
  GENRES,
  MOODS,
  CONTENT_TYPES,
  RATINGS,
  MAX_LOGIN_ATTEMPTS,
  LOCK_TIME_MS,
};
