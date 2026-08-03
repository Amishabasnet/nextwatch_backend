require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Movie = require('../models/Movie');

const MONGO_URI = process.env.MONGO_URI;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findPosterPath(title, releaseYear) {
  const { data } = await axios.get(TMDB_SEARCH_URL, {
    params: {
      api_key: TMDB_API_KEY,
      query: title,
      year: releaseYear || undefined,
    },
  });

  const results = data && data.results ? data.results : [];
  if (!results.length) return null;

  const match =
    (releaseYear &&
      results.find(
        (r) => r.release_date && r.release_date.startsWith(String(releaseYear))
      )) ||
    results[0];

  return (match && match.poster_path) || null;
}

async function run() {
  if (!TMDB_API_KEY) {
    console.error('Missing TMDB_API_KEY in .env');
    process.exit(1);
  }
  if (!MONGO_URI) {
    console.error('Missing MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const movies = await Movie.find({});
  console.log('Checking ' + movies.length + ' movies against TMDB...');
  console.log('');

  let fixed = 0;
  let unchanged = 0;
  const notFound = [];

  for (const movie of movies) {
    try {
      const posterPath = await findPosterPath(movie.title, movie.releaseYear);

      if (!posterPath) {
        notFound.push(movie.title);
        console.log('  ? No TMDB match - "' + movie.title + '"');
        await sleep(250);
        continue;
      }

      const newPosterUrl = POSTER_BASE + posterPath;

      if (newPosterUrl === movie.posterUrl) {
        unchanged++;
        console.log('  = Already correct - "' + movie.title + '"');
      } else {
        movie.posterUrl = newPosterUrl;
        await movie.save();
        fixed++;
        console.log('  + Updated - "' + movie.title + '"');
      }
    } catch (err) {
      console.error('  ! Error on "' + movie.title + '": ' + err.message);
    }

    await sleep(250);
  }

  console.log('');
  console.log('--- Done ---');
  console.log('Updated:   ' + fixed);
  console.log('Unchanged: ' + unchanged);
  console.log('Not found: ' + notFound.length);
  if (notFound.length) {
    console.log('  Titles TMDB had no match for: ' + notFound.join(', '));
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error: ' + err.message);
  process.exit(1);
});
