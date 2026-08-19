require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Movie = require('../models/Movie');
const RecommendationFeedback = require('../models/RecommendationFeedback');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nextwatch';

const DAYS_BACK = 14;
const MAX_ENTRIES = 180;
const SOURCES = ['mood', 'genre', 'history', 'rating', 'watchlist', 'trending', 'fallback'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPastDate(daysBack) {
  // Skew toward more recent days (roughly linear ramp), so the trend
  // chart shows a realistic "activity picking up" shape rather than
  // flat noise across all 14 days.
  const dayOffset = Math.floor(daysBack * (1 - Math.sqrt(Math.random())));
  const d = new Date();
  d.setHours(randomInt(8, 23), randomInt(0, 59), randomInt(0, 59), 0);
  d.setDate(d.getDate() - dayOffset);
  return d;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB:', MONGO_URI);

    const users = await User.find({}, '_id');
    const movies = await Movie.find({}, '_id');

    if (users.length === 0 || movies.length === 0) {
      console.error('Need at least one user and one movie in the DB before seeding feedback.');
      console.error(`Found ${users.length} users, ${movies.length} movies.`);
      process.exit(1);
    }

    const deleted = await RecommendationFeedback.deleteMany({});
    console.log('Cleared', deleted.deletedCount, 'existing recommendation feedback docs');

    // Build every possible (user, movie) pair, shuffle, and take a capped
    // slice — this guarantees no duplicate pairs, which the unique
    // (userId, movieId) index requires.
    const allPairs = [];
    users.forEach((u) => {
      movies.forEach((m) => {
        allPairs.push({ userId: u._id, movieId: m._id });
      });
    });
    const pairs = shuffle(allPairs).slice(0, Math.min(MAX_ENTRIES, allPairs.length));

    const docs = pairs.map(({ userId, movieId }) => {
      const clicked = Math.random() < 0.75;
      const roll = Math.random();
      const liked = clicked && roll < 0.35;
      const disliked = clicked && !liked && roll < 0.5;
      const markedIrrelevant = !liked && Math.random() < 0.08;
      const createdAt = randomPastDate(DAYS_BACK);

      return {
        userId,
        movieId,
        clicked,
        liked,
        disliked,
        markedIrrelevant,
        recommendationSource: SOURCES[randomInt(0, SOURCES.length - 1)],
        mlScore: Math.round((0.4 + Math.random() * 0.59) * 100) / 100,
        createdAt,
        updatedAt: createdAt,
      };
    });

    // timestamps: false so our hand-picked createdAt/updatedAt survive
    // instead of being overwritten with "now" by Mongoose's auto-timestamps.
    const inserted = await RecommendationFeedback.insertMany(docs, {
      ordered: false,
      timestamps: false,
    });
    console.log('Seeded', inserted.length, 'recommendation feedback docs');

    const clickedCount = docs.filter((d) => d.clicked).length;
    const likedCount = docs.filter((d) => d.liked).length;
    const dislikedCount = docs.filter((d) => d.disliked).length;
    const irrelevantCount = docs.filter((d) => d.markedIrrelevant).length;
    console.log('\nBreakdown:');
    console.log('  clicked:   ', clickedCount);
    console.log('  liked:     ', likedCount);
    console.log('  disliked:  ', dislikedCount);
    console.log('  irrelevant:', irrelevantCount);
    console.log('  spread across the last', DAYS_BACK, 'days');

    console.log('\nSeeding complete! Refresh the admin dashboard to see it.');
    process.exit(0);
  } catch (err) {
    if (err.name === 'MongoBulkWriteError' || err.name === 'BulkWriteError') {
      console.warn('Some feedback docs skipped (duplicate pair). Seeding complete.');
      process.exit(0);
    }
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();