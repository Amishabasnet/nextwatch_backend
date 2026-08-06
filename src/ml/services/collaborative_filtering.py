"""
Item-Based Collaborative Filtering
====================================

Adds a genuine collaborative-filtering signal to the recommendation
engine: "users with taste similar to yours also liked this."

Unlike the content-based signal (which only looks at *movie* attributes
- genres/moods/description), this only looks at the *ratings matrix*
- who rated what, and how - completely ignoring movie metadata. Two
movies with nothing in common on paper (different genres, different
decades) can still end up "similar" here if the same people tend to
rate them the same way.

Approach: item-based CF (item-item similarity is far more stable than
user-user similarity when the user base is small/sparse, which is the
case for a fresh platform - it doesn't need thousands of users to be
useful, and new users still benefit as soon as *any* other users have
rated overlapping movies).

Steps:
1. Build a user x movie ratings matrix from every rating on the platform.
2. Mean-center each user's row (subtract their average rating) so that
   a "generous" 8/10 rater and a "harsh" 8/10 rater are treated the
   same way - this is standard practice for rating-based CF and avoids
   bias toward users who just rate everything highly.
3. Compute item-item cosine similarity on the mean-centered matrix.
4. For a target user and a candidate movie, predict a rating as the
   similarity-weighted average of the movies the user already rated
   (weighted k-NN prediction, the classic item-based CF formula).
5. Scale the predicted 1-10 rating into a 0-1 score for the hybrid
   blend.

Cold-start behaviour (intentional, not a bug):
- If nobody has rated the candidate movie yet, or the user has no
  ratings of their own, this signal contributes 0 and the other
  signals (content/mood/genre/popularity) carry the recommendation
  instead. This is the well-known cold-start limitation of collaborative
  filtering and is worth calling out explicitly in a project report.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from ..schemas.recommendation_schema import RatingEvent

# Minimum number of *distinct users* who must have rated a pair of movies
# in common before we trust the similarity between them. Below this, the
# similarity is noise (e.g. a single shared rating "proves" nothing).
MIN_OVERLAP_USERS = 2


class CollaborativeModel:
    """
    Built fresh per-request from the ratings payload the Node backend
    sends. Ratings change constantly (new ratings every day) and the
    catalog/user base here is small, so recomputing per-request is
    simple and fast enough; at real scale you'd instead precompute this
    on a schedule (e.g. nightly) and cache it, the same way the TF-IDF
    matrix is cached at startup in movie_catalog.py.
    """

    def __init__(self, all_ratings: list[RatingEvent]):
        self.item_similarity: pd.DataFrame | None = None
        self.user_means: pd.Series | None = None
        self.raw_matrix: pd.DataFrame | None = None  # user x movie, NaN = unrated

        if len(all_ratings) < 2:
            return  # not enough data to compute any similarity

        df = pd.DataFrame([r.model_dump() for r in all_ratings])
        # If a user rated the same movie twice, keep the most recent-looking
        # (last) one rather than letting pivot_table silently average them.
        df = df.drop_duplicates(subset=["user_id", "movie_id"], keep="last")

        matrix = df.pivot_table(index="user_id", columns="movie_id", values="rating")
        if matrix.shape[0] < 2 or matrix.shape[1] < 2:
            return  # need at least 2 users and 2 movies for CF to mean anything

        self.raw_matrix = matrix
        self.user_means = matrix.mean(axis=1)

        centered = matrix.sub(self.user_means, axis=0)
        filled = centered.fillna(0.0)

        # How many users rated each pair of movies in common - used to
        # zero out similarities backed by too little evidence.
        rated_mask = (~matrix.isna()).astype(float)
        overlap_counts = rated_mask.T.dot(rated_mask)

        sim = cosine_similarity(filled.T.values)
        sim_df = pd.DataFrame(sim, index=filled.columns, columns=filled.columns)
        sim_df = sim_df.where(overlap_counts >= MIN_OVERLAP_USERS, 0.0)
        sim_arr = sim_df.to_numpy(copy=True)
        np.fill_diagonal(sim_arr, 1.0)
        sim_df = pd.DataFrame(sim_arr, index=sim_df.index, columns=sim_df.columns)

        self.item_similarity = sim_df

    @property
    def is_usable(self) -> bool:
        return self.item_similarity is not None

    def predict_scores(
        self, user_id: str, known_ratings: dict[str, float], candidate_movie_ids: list[str]
    ) -> dict[str, float]:
        """
        Returns {movie_id: score_0_to_1} for every candidate movie the
        collaborative model has an opinion on. Movies it has no signal
        for are simply omitted (caller should treat missing = 0).
        """
        if not self.is_usable or not known_ratings:
            return {}

        rated_ids = [mid for mid in known_ratings if mid in self.item_similarity.index]
        if not rated_ids:
            return {}

        # Baseline for this user: their own average rating if we've seen
        # enough of their history in the matrix, otherwise fall back to
        # the average of the ratings passed in for this request.
        if self.user_means is not None and user_id in self.user_means.index:
            user_mean = float(self.user_means.loc[user_id])
        else:
            user_mean = float(np.mean(list(known_ratings.values())))

        results: dict[str, float] = {}
        for movie_id in candidate_movie_ids:
            if movie_id not in self.item_similarity.index:
                continue

            sims = self.item_similarity.loc[movie_id, rated_ids]
            weights = sims.abs()
            denom = float(weights.sum())
            if denom < 1e-9:
                continue

            # Classic baseline-corrected item-based CF prediction:
            # mean + weighted average of how far each similar rating
            # deviated from the user's own mean.
            numer = float(sum(sims[mid] * (known_ratings[mid] - user_mean) for mid in rated_ids))
            predicted_rating = user_mean + (numer / denom)

            score = max(0.0, min(1.0, predicted_rating / 10.0))
            results[movie_id] = score

        return results
