"""
NextWatch Hybrid Recommendation Engine
========================================

Strategy: content-based filtering using TF-IDF + cosine similarity,
blended with several weighted signal layers to form a simple hybrid score.

Signal layers (each contributes a 0-1 sub-score, then combined with weights):

1. CONTENT SIMILARITY (cosine similarity)
   - Builds a synthetic "user profile vector" from:
       a) genres/moods of movies in viewing history
       b) genres/moods of movies the user rated highly (>=7) or explicitly liked
       c) the user's selected mood and favorite genres
   - Projects that profile into the same TF-IDF space as the movie catalog
   - cosine_similarity(profile_vector, every_movie_vector) -> content_score

2. MOOD MATCH
   - Direct boolean/partial match between selected mood and a movie's mood tags

3. GENRE MATCH
   - Overlap between user's favorite_genres and movie's genres (Jaccard-style)

4. HISTORY AFFINITY
   - Average content similarity between the candidate movie and everything
     already in the user's viewing history (rewards "more of what you watched")

5. RATING AFFINITY
   - Average content similarity between the candidate movie and movies the
     user rated highly / explicitly liked (penalizes similarity to disliked ones)

6. COLLABORATIVE FILTERING (item-based, ratings-matrix similarity)
   - Ignores movie metadata entirely. Uses the platform-wide user x movie
     ratings matrix to find movies that people with similar rating
     patterns to this user also rated highly.
   - See collaborative_filtering.py for the full explanation. Contributes
     0 for a brand-new user or a movie nobody has rated yet (cold start).

7. POPULARITY PRIOR
   - The movie's own average_score, scaled to 0-1, as a small tie-breaking signal

Final hybrid score = weighted sum of the above, each clipped to [0, 1].

Exclusions:
   - Movies already in viewing history are excluded from recommendations
     (no point recommending what's already watched)
   - Movies in disliked_movie_ids are hard-excluded
   - Movies in excluded_genres are hard-excluded
"""

from __future__ import annotations
from typing import Optional
import numpy as np
import pandas as pd

from ..models.movie_catalog import catalog
from ..schemas.recommendation_schema import RecommendationRequest, RecommendedMovie, RecommendationSignals
from .collaborative_filtering import CollaborativeModel


# ─── Tunable hybrid weights ───────────────────────────────────────────────────
# Must sum to 1.0 for the final score to stay within [0, 1].
WEIGHTS = {
    "content": 0.25,
    "mood": 0.15,
    "genre": 0.15,
    "history": 0.10,
    "rating": 0.10,
    "collaborative": 0.20,
    "popularity": 0.05,
}


def _safe_jaccard(set_a: set, set_b: set) -> float:
    """Jaccard similarity between two sets, 0 if both empty."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union else 0.0


def _build_user_profile_text(request: RecommendationRequest) -> str:
    """
    Builds the text "soup" representing the user's taste profile,
    combining favorite genres, mood, and genres from highly-rated /
    liked / watched movies. This gets vectorized into the same
    TF-IDF space as the movie catalog for content_score calculation.
    """
    parts: list[str] = []

    # Favorite genres (explicit signal), weighted heavily
    parts += request.favorite_genres * 3

    # Mood-derived genres
    mood = request.resolved_mood()
    if mood:
        parts += [mood] * 2
        if request.mood and request.mood.suggested_genres:
            parts += request.mood.suggested_genres * 2

    # Genres from viewing history
    for item in request.viewing_history:
        parts += item.genres

    # Genres from highly rated / liked movies
    for r in request.ratings:
        if r.rating >= 7 or r.liked:
            parts += r.genres * 2  # weight liked/high-rated genres more

    if not parts:
        return ""
    return " ".join(parts)


def _history_movie_ids(request: RecommendationRequest) -> set[str]:
    return {item.movie_id for item in request.viewing_history if item.movie_id}


def _all_rated_movie_ids(request: RecommendationRequest) -> set[str]:
    """
    Any movie the user has already rated (regardless of score) has already
    been seen and evaluated — it should never be recommended again.
    """
    return {r.movie_id for r in request.ratings if r.movie_id}


def _liked_or_high_rated_movie_ids(request: RecommendationRequest) -> set[str]:
    ids = set(request.liked_movie_ids)
    for r in request.ratings:
        if r.movie_id and (r.rating >= 7 or r.liked):
            ids.add(r.movie_id)
    return ids


def _disliked_movie_ids(request: RecommendationRequest) -> set[str]:
    ids = set(request.disliked_movie_ids)
    for r in request.ratings:
        if r.movie_id and (r.disliked or r.rating <= 3):
            ids.add(r.movie_id)
    return ids


def _average_similarity_to_set(movie_index: int, reference_ids: set[str]) -> float:
    """
    Average cosine similarity between the candidate movie at `movie_index`
    and a set of reference movies (e.g. viewing history or liked movies),
    using the precomputed catalog similarity matrix.
    """
    if not reference_ids:
        return 0.0

    ref_indices = [
        catalog.get_index(mid) for mid in reference_ids if catalog.get_index(mid) is not None
    ]
    if not ref_indices:
        return 0.0

    sims = catalog.similarity_matrix[movie_index, ref_indices]
    return float(np.mean(sims))


def _mood_match_score(movie_moods: list[str], mood: Optional[str]) -> float:
    if not mood:
        return 0.0
    return 1.0 if mood in movie_moods else 0.0


def _genre_match_score(movie_genres: list[str], favorite_genres: list[str]) -> float:
    return _safe_jaccard(set(movie_genres), set(favorite_genres))


def _popularity_score(average_score: float) -> float:
    """Scales a 0-10 average_score rating into a 0-1 prior."""
    return max(0.0, min(1.0, average_score / 10.0))


def _build_reason(
    matches_mood: bool,
    matches_genre: bool,
    matches_history: bool,
    matches_rating: bool,
    matches_collaborative: bool,
) -> str:
    parts = []
    if matches_mood:
        parts.append("your selected mood")
    if matches_genre:
        parts.append("your favorite genres")
    if matches_history:
        parts.append("your viewing history")
    if matches_rating:
        parts.append("movies you've rated highly")
    if matches_collaborative:
        parts.append("users with similar taste to yours")

    if not parts:
        return "Recommended based on overall popularity and catalog trends."
    if len(parts) == 1:
        return f"Recommended because it matches {parts[0]}."

    last = parts.pop()
    return f"Recommended because it matches {', '.join(parts)}, and {last}."


def generate_recommendations(request: RecommendationRequest) -> list[RecommendedMovie]:
    """
    Main entry point. Computes a hybrid score for every eligible movie
    in the catalog and returns the top-N as RecommendedMovie objects,
    sorted descending by score.
    """
    mood = request.resolved_mood()
    history_ids = _history_movie_ids(request)
    rated_ids = _all_rated_movie_ids(request)
    liked_ids = _liked_or_high_rated_movie_ids(request)
    disliked_ids = _disliked_movie_ids(request)
    excluded_genres = set(request.excluded_genres)

    # Movies the user has already watched or rated should never be re-recommended
    already_seen_ids = history_ids | rated_ids | set(request.liked_movie_ids) | disliked_ids

    # ── Build the synthetic user profile vector for content similarity ────────
    profile_text = _build_user_profile_text(request)
    if profile_text:
        profile_vector = catalog.vectorize_text(profile_text)
        content_scores = catalog.similarity_to_vector(profile_vector)
    else:
        # No signal at all -> neutral content score for every movie
        content_scores = np.zeros(len(catalog.df))

    # ── Collaborative filtering: build the ratings-matrix model once ──────────
    # This only uses (user_id, movie_id, rating) triples across the whole
    # platform - no movie metadata at all - so it can surface completely
    # different recommendations than the content-based signals above.
    collab_model = CollaborativeModel(request.all_ratings)

    known_ratings: dict[str, float] = {}
    for r in request.ratings:
        if r.movie_id and r.rating:
            known_ratings[r.movie_id] = r.rating
    # Treat explicit likes/dislikes without a star rating as pseudo-ratings
    # so they still feed the collaborative model.
    for mid in request.liked_movie_ids:
        known_ratings.setdefault(mid, 9.0)
    for mid in request.disliked_movie_ids:
        known_ratings.setdefault(mid, 2.0)

    candidate_ids = [
        row["movie_id"] for _, row in catalog.df.iterrows() if row["movie_id"] not in already_seen_ids
    ]
    collab_scores = collab_model.predict_scores(request.user_id, known_ratings, candidate_ids)

    results: list[tuple[float, RecommendedMovie]] = []

    for idx, row in catalog.df.iterrows():
        movie_id = row["movie_id"]

        # ── Hard exclusions ──────────────────────────────────────────────────
        if movie_id in already_seen_ids:
            continue
        if excluded_genres and excluded_genres.intersection(set(row["genres"])):
            continue
        if request.preferred_content_types and row["content_type"] not in request.preferred_content_types:
            continue

        # ── Signal sub-scores ────────────────────────────────────────────────
        content_score = float(content_scores[idx])
        mood_score = _mood_match_score(row["moods"], mood)
        genre_score = _genre_match_score(row["genres"], request.favorite_genres)
        history_score = _average_similarity_to_set(idx, history_ids)
        rating_score = _average_similarity_to_set(idx, liked_ids)
        collab_score = collab_scores.get(movie_id, 0.0)
        popularity_score = _popularity_score(row["average_score"])

        hybrid_score = (
            WEIGHTS["content"] * content_score
            + WEIGHTS["mood"] * mood_score
            + WEIGHTS["genre"] * genre_score
            + WEIGHTS["history"] * history_score
            + WEIGHTS["rating"] * rating_score
            + WEIGHTS["collaborative"] * collab_score
            + WEIGHTS["popularity"] * popularity_score
        )
        hybrid_score = round(float(np.clip(hybrid_score, 0.0, 1.0)), 4)

        # Reason flags — use a light threshold so "matches" feels meaningful
        matches_mood = mood_score >= 1.0
        matches_genre = genre_score > 0.0
        matches_history = history_score >= 0.15
        matches_rating = rating_score >= 0.15
        matches_collaborative = collab_score >= 0.6  # predicted rating ~6+/10

        reason = _build_reason(
            matches_mood, matches_genre, matches_history, matches_rating, matches_collaborative
        )

        recommended = RecommendedMovie(
            movie_id=movie_id,
            title=row["title"],
            poster_url=row["poster_url"],
            genres=row["genres"],
            rating=row["average_score"],
            release_year=int(row["release_year"]),
            content_type=row["content_type"],
            score=hybrid_score,
            reason=reason,
            signals=RecommendationSignals(
                matches_mood=matches_mood,
                matches_genre=matches_genre,
                matches_history=matches_history,
                matches_rating=matches_rating,
                matches_collaborative=matches_collaborative,
            ),
        )
        results.append((hybrid_score, recommended))

    # Sort by score descending, then by popularity as a tiebreaker
    results.sort(key=lambda pair: (pair[0], pair[1].rating), reverse=True)

    top_results = [movie for _, movie in results[: request.limit]]
    return top_results
