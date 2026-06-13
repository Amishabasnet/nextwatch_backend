const Movie = require('../models/Movie');

// Add a new movie to the system
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

    // Make sure all required movie details have been provided
    if (
      !title ||
      !description ||
      !genre ||
      !language ||
      !releaseYear ||
      !actors ||
      !director
    ) {
      return res.status(400).json({
        message:
          'Please provide all required fields: title, description, genre, language, releaseYear, actors, director',
      });
    }

    // Genre must contain at least one value
    if (!Array.isArray(genre) || genre.length === 0) {
      return res.status(400).json({
        message: 'genre must be a non-empty array',
      });
    }

    // At least one actor must be included
    if (!Array.isArray(actors) || actors.length === 0) {
      return res.status(400).json({
        message: 'actors must be a non-empty array',
      });
    }

    // Tags are optional, but they must be provided as an array
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({
        message: 'tags must be an array',
      });
    }

    // Save the movie with default values for optional fields
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
      moodCategory: moodCategory
        ? moodCategory.toLowerCase().trim()
        : '',
      posterUrl: posterUrl || '',
      trailerUrl: trailerUrl || '',
    });

    res.status(201).json(movie);
  } catch (error) {
    next(error);
  }
};

// Get all movies and show the newest ones first
const getMovies = async (req, res, next) => {
  try {
    const movies = await Movie.find({}).sort({
      createdAt: -1,
    });

    res.status(200).json(movies);
  } catch (error) {
    next(error);
  }
};

// Get the details of one movie using its ID
const getMovieById = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

    // Return an error when the requested movie does not exist
    if (!movie) {
      return res.status(404).json({
        message: 'Movie not found',
      });
    }

    res.status(200).json(movie);
  } catch (error) {
    next(error);
  }
};

// Update the details of an existing movie
const updateMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

    // Check that the movie exists before updating it
    if (!movie) {
      return res.status(404).json({
        message: 'Movie not found',
      });
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

    // Check the format of the genre list when it is provided
    if (genre && (!Array.isArray(genre) || genre.length === 0)) {
      return res.status(400).json({
        message: 'genre must be a non-empty array',
      });
    }

    // Check the format of the actor list when it is provided
    if (actors && (!Array.isArray(actors) || actors.length === 0)) {
      return res.status(400).json({
        message: 'actors must be a non-empty array',
      });
    }

    // Check that tags are provided as an array
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({
        message: 'tags must be an array',
      });
    }

    // Update only the fields included in the request
    if (title !== undefined) movie.title = title;
    if (description !== undefined) movie.description = description;
    if (genre !== undefined) movie.genre = genre;
    if (language !== undefined) movie.language = language;

    if (releaseYear !== undefined) {
      movie.releaseYear = Number(releaseYear);
    }

    if (actors !== undefined) movie.actors = actors;
    if (director !== undefined) movie.director = director;

    if (rating !== undefined) {
      movie.rating = Number(rating);
    }

    if (tags !== undefined) movie.tags = tags;

    if (moodCategory !== undefined) {
      movie.moodCategory = moodCategory
        ? moodCategory.toLowerCase().trim()
        : '';
    }

    if (posterUrl !== undefined) movie.posterUrl = posterUrl;
    if (trailerUrl !== undefined) movie.trailerUrl = trailerUrl;

    const updatedMovie = await movie.save();

    res.status(200).json(updatedMovie);
  } catch (error) {
    next(error);
  }
};

// Remove a movie from the system
const deleteMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

    // Check that the movie exists before deleting it
    if (!movie) {
      return res.status(404).json({
        message: 'Movie not found',
      });
    }

    await movie.deleteOne();

    res.status(200).json({
      message: 'Movie deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Search, filter and sort the available movies
const searchMovies = async (req, res, next) => {
  try {
    const {
      title,
      genre,
      mood,
      language,
      rating,
      year,
      sortBy,
    } = req.query;

    const query = {};

    // Search for movies with a matching title
    if (title) {
      query.title = {
        $regex: title,
        $options: 'i',
      };
    }

    // Find movies that include the selected genre
    if (genre) {
      query.genre = {
        $regex: genre,
        $options: 'i',
      };
    }

    // Filter movies using the selected mood
    if (mood) {
      query.moodCategory = mood.toLowerCase().trim();
    }

    // Find movies available in the selected language
    if (language) {
      query.language = {
        $regex: language,
        $options: 'i',
      };
    }

    // Show movies with at least the requested rating
    if (rating) {
      query.rating = {
        $gte: Number(rating),
      };
    }

    // Filter movies by their release year
    if (year) {
      query.releaseYear = Number(year);
    }

    // Decide how the search results should be arranged
    let sort = {};

    if (sortBy === 'popularity') {
      // Higher-rated and newer movies are treated as more popular
      sort = {
        rating: -1,
        releaseYear: -1,
      };
    } else if (sortBy === 'rating') {
      sort = {
        rating: -1,
      };
    } else if (sortBy === 'year') {
      sort = {
        releaseYear: -1,
      };
    } else {
      // Show recently added movies first by default
      sort = {
        createdAt: -1,
      };
    }

    const movies = await Movie.find(query).sort(sort);

    res.status(200).json(movies);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMovie,
  getMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  searchMovies,
};