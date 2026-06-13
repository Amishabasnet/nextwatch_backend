const Movie = require('../models/Movie');

/**
 * @desc    Create a new movie (Admin only)
 * @route   POST /api/admin/movies
 * @access  Private/Admin
 */
const createMovie = async (req, res, next) => {
  try {
    const {
      title,
      description,
      genre,
      language,
      releaseYear,
      actors,
      director,
      rating,
      tags,
      moodCategory,
      posterUrl,
      trailerUrl,
    } = req.body;

    // Field validations
    if (!title || !description || !genre || !language || !releaseYear || !actors || !director) {
      return res.status(400).json({
        message: 'Please provide all required fields: title, description, genre, language, releaseYear, actors, director',
      });
    }

    if (!Array.isArray(genre) || genre.length === 0) {
      return res.status(400).json({ message: 'genre must be a non-empty array' });
    }
    if (!Array.isArray(actors) || actors.length === 0) {
      return res.status(400).json({ message: 'actors must be a non-empty array' });
    }
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ message: 'tags must be an array' });
    }

    const movie = await Movie.create({
      title,
      description,
      genre,
      language,
      releaseYear: Number(releaseYear),
      actors,
      director,
      rating: rating !== undefined ? Number(rating) : 0,
      tags: tags || [],
      moodCategory: moodCategory ? moodCategory.toLowerCase().trim() : '',
      posterUrl: posterUrl || '',
      trailerUrl: trailerUrl || '',
    });

    res.status(201).json(movie);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all movies (Public)
 * @route   GET /api/movies
 * @access  Public
 */
const getMovies = async (req, res, next) => {
  try {
    const movies = await Movie.find({}).sort({ createdAt: -1 });
    res.status(200).json(movies);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single movie by ID (Public)
 * @route   GET /api/movies/:id
 * @access  Public
 */
const getMovieById = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.status(200).json(movie);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a movie (Admin only)
 * @route   PUT /api/admin/movies/:id
 * @access  Private/Admin
 */
const updateMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const {
      title,
      description,
      genre,
      language,
      releaseYear,
      actors,
      director,
      rating,
      tags,
      moodCategory,
      posterUrl,
      trailerUrl,
    } = req.body;

    // Validation
    if (genre && (!Array.isArray(genre) || genre.length === 0)) {
      return res.status(400).json({ message: 'genre must be a non-empty array' });
    }
    if (actors && (!Array.isArray(actors) || actors.length === 0)) {
      return res.status(400).json({ message: 'actors must be a non-empty array' });
    }
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ message: 'tags must be an array' });
    }

    // Update fields
    if (title !== undefined) movie.title = title;
    if (description !== undefined) movie.description = description;
    if (genre !== undefined) movie.genre = genre;
    if (language !== undefined) movie.language = language;
    if (releaseYear !== undefined) movie.releaseYear = Number(releaseYear);
    if (actors !== undefined) movie.actors = actors;
    if (director !== undefined) movie.director = director;
    if (rating !== undefined) movie.rating = Number(rating);
    if (tags !== undefined) movie.tags = tags;
    if (moodCategory !== undefined) movie.moodCategory = moodCategory ? moodCategory.toLowerCase().trim() : '';
    if (posterUrl !== undefined) movie.posterUrl = posterUrl;
    if (trailerUrl !== undefined) movie.trailerUrl = trailerUrl;

    const updatedMovie = await movie.save();
    res.status(200).json(updatedMovie);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a movie (Admin only)
 * @route   DELETE /api/admin/movies/:id
 * @access  Private/Admin
 */
const deleteMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    await movie.deleteOne();
    res.status(200).json({ message: 'Movie deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search and filter movies (Public)
 * @route   GET /api/movies/search
 * @access  Public
 */
const searchMovies = async (req, res, next) => {
  try {
    const { title, genre, mood, language, rating, year, sortBy } = req.query;

    const query = {};

    // 1. Title Search (Case-insensitive Regex)
    if (title) {
      query.title = { $regex: title, $options: 'i' };
    }

    // 2. Genre Filter (Matches any of the array elements)
    if (genre) {
      query.genre = { $regex: genre, $options: 'i' };
    }

    // 3. Mood Category Filter
    if (mood) {
      query.moodCategory = mood.toLowerCase().trim();
    }

    // 4. Language Filter
    if (language) {
      query.language = { $regex: language, $options: 'i' };
    }

    // 5. Rating Filter (Minimum Rating)
    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    // 6. Release Year Filter
    if (year) {
      query.releaseYear = Number(year);
    }

    // 7. Sort Options
    let sort = {};
    if (sortBy === 'popularity') {
      // Use higher rating and release year as sorting proxy for popularity
      sort = { rating: -1, releaseYear: -1 };
    } else if (sortBy === 'rating') {
      sort = { rating: -1 };
    } else if (sortBy === 'year') {
      sort = { releaseYear: -1 };
    } else {
      sort = { createdAt: -1 };
    }

    const movies = await Movie.find(query).sort(sort);
    res.status(200).json(movies);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMovies,
  getMovie,
  createMovie: createMovieHandler,
  updateMovie: updateMovieHandler,
  deleteMovie: deleteMovieHandler,
  getRecommendations,
  searchMovies: searchMoviesHandler,
};