"""
Movie catalog loader.

Wraps the mock MovieLens-style dataset in a pandas DataFrame and
pre-computes a TF-IDF content matrix (genres + moods + description)
used for content-based cosine similarity.

This module is loaded once at startup — the vectorizer and matrix
are cached as module-level singletons so every request reuses them
instead of re-fitting TF-IDF on every call.
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.data.movies_data import MOVIES


def _build_content_soup(row: pd.Series) -> str:
    """
    Combines genres, moods, and description into a single text blob
    ("content soup") that TF-IDF can vectorize. Genres and moods are
    repeated to weight them more heavily than free-text description.
    """
    genres_text = " ".join(row["genres"]) + " " + " ".join(row["genres"])  # weight x2
    moods_text = " ".join(row["moods"]) + " " + " ".join(row["moods"])     # weight x2
    return f"{genres_text} {moods_text} {row['description']}"


class MovieCatalog:
    """
    Singleton-style catalog that holds:
    - the movies DataFrame
    - the fitted TF-IDF vectorizer
    - the precomputed movie x movie cosine similarity matrix
    """

    def __init__(self, movies: list[dict]):
        self.df = pd.DataFrame(movies)
        self.df["content_soup"] = self.df.apply(_build_content_soup, axis=1)

        self.vectorizer = TfidfVectorizer(stop_words="english")
        self.tfidf_matrix = self.vectorizer.fit_transform(self.df["content_soup"])

        # Precompute full movie-to-movie similarity matrix once.
        # For a real-scale catalog you'd compute this lazily / approximate it,
        # but for a mock catalog of this size a dense matrix is fine.
        self.similarity_matrix = cosine_similarity(self.tfidf_matrix)

        self._id_to_index = {
            movie_id: idx for idx, movie_id in enumerate(self.df["movie_id"])
        }

    def get_index(self, movie_id: str) -> int | None:
        return self._id_to_index.get(movie_id)

    def get_row(self, movie_id: str) -> pd.Series | None:
        idx = self.get_index(movie_id)
        return None if idx is None else self.df.iloc[idx]

    def all_movie_ids(self) -> list[str]:
        return self.df["movie_id"].tolist()

    def similarity_to_vector(self, query_vector) -> np.ndarray:
        """
        Returns the cosine similarity of an arbitrary query vector
        (e.g. a synthetic "user profile vector") against every movie
        in the catalog's TF-IDF space.
        """
        return cosine_similarity(query_vector, self.tfidf_matrix).flatten()

    def vectorize_text(self, text: str):
        """Transforms an arbitrary text string into the catalog's TF-IDF space."""
        return self.vectorizer.transform([text])


# Module-level singleton — loaded once when the app starts.
catalog = MovieCatalog(MOVIES)
