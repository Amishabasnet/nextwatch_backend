const toMovieDTO = (movie) => ({
  id: movie._id,
  title: movie.title,
  description: movie.description,
  genres: movie.genres,
  contentType: movie.contentType,
  rating: movie.rating,
  releaseYear: movie.releaseYear,
  language: movie.language,
  posterUrl: movie.posterUrl,
  trailerUrl: movie.trailerUrl,
  imdbId: movie.imdbId,
  averageScore: movie.averageScore,
  moods: movie.moods,
  createdAt: movie.createdAt,
});

const toMovieListDTO = (movies) => movies.map(toMovieDTO);

module.exports = { toMovieDTO, toMovieListDTO };
