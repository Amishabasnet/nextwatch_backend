const Movie = require('../models/Movie');
const AppError = require('../utils/AppError');

// Fields that users are not allowed to set or update directly
const PROTECTED_FIELDS = [
  'rating',
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
];

// Remove protected fields from the submitted data
const sanitizeBody = (body) => {
  const safe = { ...body };

  PROTECTED_FIELDS.forEach((field) => {
    delete safe[field];
  });

  return safe;
};

// Movie fields that can be used to sort the results
const ALLOWED_SORT_FIELDS = new Set([
  'rating.average',
  '-rating.average',
  'releaseYear',
  '-releaseYear',
  'title',
  '-title',
  'duration',
  '-duration',
  'createdAt',
  '-createdAt',
]);

// Get a filtered and paginated list of movies
const getAllMovies = async (query) => {
  const {
    page = 1,
    limit = 20,
    genre,
    language,
    moodTag,
    status,
    releaseYear,
    minRating,
    search,
    sortBy = '-rating.average',
  } = query;

  // Build the movie filter from the submitted query values
  const filter = {};

  if (genre) {
    filter.genres = genre;
  }

  if (language) {
    filter.language = language;
  }

  if (moodTag) {
    filter.moodTags = moodTag;
  }

  if (status) {
    filter.status = status;
  }

  if (releaseYear) {
    filter.releaseYear = Number(releaseYear);
  }

  // Show movies that meet the minimum rating
  if (minRating) {
    const min = parseFloat(minRating);

    if (!isNaN(min)) {
      filter['rating.average'] = { $gte: min };
    }
  }

  // Search through the movie title, description and keywords
  if (search) {
    filter.$text = {
      $search: String(search),
    };
  }

  // Prepare the page number, page size and number of skipped records
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(Math.max(1, Number(limit)), 100);
  const skip = (pageNum - 1) * limitNum;

  // Use the requested sort option only when it is allowed
  const safeSort = ALLOWED_SORT_FIELDS.has(sortBy)
    ? sortBy
    : '-rating.average';

  // Get the movies and total number of matching records at the same time
  const [movies, total] = await Promise.all([
    Movie.find(filter)
      .sort(safeSort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v'),

    Movie.countDocuments(filter),
  ]);

  return {
    movies,
    total,
    page: pageNum,
    limit: limitNum,
  };
};

// Get one movie using its ID
const getMovieById = async (id) => {
  // Include the reviews and basic details of the users who wrote them
  const movie = await Movie.findById(id)
    .populate({
      path: 'reviews',
      select: 'rating content spoiler user createdAt',
      populate: {
        path: 'user',
        select: 'fullName avatar',
      },
    })
    .select('-__v');

  if (!movie) {
    throw new AppError('Movie not found', 404);
  }

  return movie;
};

// Create and save a new movie
const createMovie = async (body) => {
  // Remove any fields that should only be managed by the system
  const safe = sanitizeBody(body);

  const movie = await Movie.create(safe);

  return movie;
};

// Update the submitted fields of an existing movie
const updateMovie = async (id, body) => {
  // Remove protected fields before updating the movie
  const safe = sanitizeBody(body);

  const movie = await Movie.findByIdAndUpdate(
    id,
    { $set: safe },
    {
      new: true,
      runValidators: true,
    }
  ).select('-__v');

  if (!movie) {
    throw new AppError('Movie not found', 404);
  }

  return movie;
};

// Delete a movie using its ID
const deleteMovie = async (id) => {
  const movie = await Movie.findByIdAndDelete(id);

  if (!movie) {
    throw new AppError('Movie not found', 404);
  }

  return movie;
};

const {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAME_TO_CODE,
} = require('../models/Movie');

// Make user input safe before using it in a regular expression
const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Convert a language name into its supported language code
const resolveLanguageCode = (input) => {
  const normalized = input.toLowerCase().trim();

  // Return the value directly when it is already a supported code
  if (SUPPORTED_LANGUAGES.includes(normalized)) {
    return normalized;
  }

  // Try to find the code using the full language name
  return LANGUAGE_NAME_TO_CODE[normalized] ?? normalized;
};

// Search for movies using one or more filters
const searchMovies = async (query) => {
  const {
    title,
    genre,
    mood,
    rating,
    releaseYear,
    yearFrom,
    yearTo,
    language,
    keyword,
    page = 1,
    limit = 20,
    sortBy = '-rating.average',
  } = query;

  const filter = {};
  const appliedFilters = {};

  // Search for part of a movie title without considering letter case
  if (title?.trim()) {
    filter.title = {
      $regex: escapeRegex(title.trim()),
      $options: 'i',
    };

    appliedFilters.title = title.trim();
  }

  // Accept one genre, comma-separated genres or an array of genres
  if (genre) {
    const genres = (
      Array.isArray(genre)
        ? genre
        : genre.split(',')
    )
      .map((item) => item.trim())
      .filter(Boolean);

    filter.genres =
      genres.length === 1
        ? genres[0]
        : { $in: genres };

    appliedFilters.genres = genres;
  }

  // Filter movies using the selected mood
  if (mood?.trim()) {
    filter.moodTags = mood.trim();
    appliedFilters.mood = mood.trim();
  }

  // Show movies with at least the requested rating
  if (rating !== undefined && rating !== '') {
    const min = parseFloat(rating);

    if (!isNaN(min)) {
      filter['rating.average'] = {
        $gte: min,
      };

      appliedFilters.minRating = min;
    }
  }

  // Use an exact year when provided
  if (releaseYear) {
    filter.releaseYear = Number(releaseYear);
    appliedFilters.releaseYear = Number(releaseYear);
  } else if (yearFrom || yearTo) {
    // Otherwise, allow the user to search within a year range
    filter.releaseYear = {};

    if (yearFrom) {
      filter.releaseYear.$gte = Number(yearFrom);
      appliedFilters.yearFrom = Number(yearFrom);
    }

    if (yearTo) {
      filter.releaseYear.$lte = Number(yearTo);
      appliedFilters.yearTo = Number(yearTo);
    }
  }

  // Accept either a full language name or a language code
  if (language?.trim()) {
    const code = resolveLanguageCode(language.trim());

    filter.language = code;
    appliedFilters.language = code;
  }

  // Search for part of a keyword without considering letter case
  if (keyword?.trim()) {
    filter.keywords = {
      $regex: escapeRegex(keyword.trim()),
      $options: 'i',
    };

    appliedFilters.keyword = keyword.trim();
  }

  // Prepare pagination values
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(Math.max(1, Number(limit)), 100);
  const skip = (pageNum - 1) * limitNum;

  // Use a safe default when the submitted sorting field is not allowed
  const safeSort = ALLOWED_SORT_FIELDS.has(sortBy)
    ? sortBy
    : '-rating.average';

  // Get the matching movies and the total count at the same time
  const [movies, total] = await Promise.all([
    Movie.find(filter)
      .sort(safeSort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v'),

    Movie.countDocuments(filter),
  ]);

  return {
    movies,
    total,
    page: pageNum,
    limit: limitNum,
    appliedFilters,

    // Show how many search filters were used
    activeFilterCount: Object.keys(appliedFilters).length,
  };
};

module.exports = {
  getAllMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  searchMovies,
};