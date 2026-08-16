/**
 * Item-Based Collaborative Filtering (Node port)
 * ================================================
 *
 * JS port of ml/services/collaborative_filtering.py, used as the
 * in-process fallback when the Python ML service is unreachable so the
 * "users with similar taste also liked this" signal isn't lost.
 *
 * Same approach as the Python version:
 * 1. Build a user x movie ratings matrix from every rating on the platform.
 * 2. Mean-center each user's row (subtract their average rating).
 * 3. Compute item-item cosine similarity on the mean-centered matrix,
 *    zeroing out any pair backed by fewer than MIN_OVERLAP_USERS shared
 *    raters (too little evidence to trust).
 * 4. Predict a rating as the similarity-weighted average deviation from
 *    the user's own mean (classic item-based CF / weighted k-NN).
 * 5. Scale the predicted 1-10 rating into a 0-1 score.
 *
 * Cold-start behaviour (intentional, not a bug): if nobody has rated the
 * candidate movie yet, or the user has no ratings, this signal
 * contributes nothing and the other scoring signals carry the request.
 */

'use strict';

const MIN_OVERLAP_USERS = 2;

class CollaborativeModel {
  /**
   * @param {Array<{userId: string, movieId: string, rating: number}>} allRatings
   */
  constructor(allRatings = []) {
    this.itemSimilarity = null; // Map<movieId, Map<movieId, similarity>>
    this.userMeans = null; // Map<userId, meanRating>
    this.usable = false;

    if (!Array.isArray(allRatings) || allRatings.length < 2) return;

    // Deduplicate (userId, movieId) pairs, keeping the last occurrence -
    // mirrors df.drop_duplicates(..., keep="last") in the Python version.
    const dedup = new Map();
    for (const r of allRatings) {
      if (!r || r.userId == null || r.movieId == null || r.rating == null) continue;
      const uid = String(r.userId);
      const mid = String(r.movieId);
      const rating = Number(r.rating);
      if (Number.isNaN(rating)) continue;
      dedup.set(`${uid}::${mid}`, { userId: uid, movieId: mid, rating });
    }

    // user -> Map(movieId -> rating)
    const matrix = new Map();
    const movieSet = new Set();
    for (const { userId, movieId, rating } of dedup.values()) {
      if (!matrix.has(userId)) matrix.set(userId, new Map());
      matrix.get(userId).set(movieId, rating);
      movieSet.add(movieId);
    }

    const userIds = [...matrix.keys()];
    const movieIds = [...movieSet];
    if (userIds.length < 2 || movieIds.length < 2) return; // not enough data

    // Per-user mean rating
    const userMeans = new Map();
    for (const uid of userIds) {
      const vals = [...matrix.get(uid).values()];
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      userMeans.set(uid, mean);
    }

    // Mean-centered rating per movie, keyed by user: Map<movieId, Map<userId, centered>>
    const movieUserCentered = new Map();
    for (const mid of movieIds) movieUserCentered.set(mid, new Map());
    for (const uid of userIds) {
      const mean = userMeans.get(uid);
      for (const [mid, rating] of matrix.get(uid).entries()) {
        movieUserCentered.get(mid).set(uid, rating - mean);
      }
    }

    // Precompute each movie's vector norm (over the users who rated it -
    // equivalent to computing the norm on the zero-filled full vector,
    // since non-raters contribute 0).
    const movieNorm = new Map();
    for (const mid of movieIds) {
      const centeredVals = [...movieUserCentered.get(mid).values()];
      const sumSq = centeredVals.reduce((a, v) => a + v * v, 0);
      movieNorm.set(mid, Math.sqrt(sumSq));
    }

    // Item-item cosine similarity, gated by shared-rater overlap.
    const itemSimilarity = new Map();
    for (const mid of movieIds) itemSimilarity.set(mid, new Map());

    for (let i = 0; i < movieIds.length; i++) {
      const a = movieIds[i];
      itemSimilarity.get(a).set(a, 1.0); // diagonal, matches np.fill_diagonal(..., 1.0)

      const ratersA = movieUserCentered.get(a);
      const normA = movieNorm.get(a);

      for (let j = i + 1; j < movieIds.length; j++) {
        const b = movieIds[j];
        const ratersB = movieUserCentered.get(b);
        const normB = movieNorm.get(b);

        // Iterate the smaller side for the overlap/dot-product computation.
        const [small, large] = ratersA.size <= ratersB.size ? [ratersA, ratersB] : [ratersB, ratersA];

        let overlap = 0;
        let dot = 0;
        for (const [uid, val] of small.entries()) {
          if (large.has(uid)) {
            overlap += 1;
            dot += val * large.get(uid);
          }
        }

        let sim = 0;
        if (overlap >= MIN_OVERLAP_USERS && normA > 0 && normB > 0) {
          sim = dot / (normA * normB);
        }

        itemSimilarity.get(a).set(b, sim);
        itemSimilarity.get(b).set(a, sim);
      }
    }

    this.itemSimilarity = itemSimilarity;
    this.userMeans = userMeans;
    this.usable = true;
  }

  get isUsable() {
    return this.usable;
  }

  /**
   * @param {string} userId
   * @param {Object<string, number>} knownRatings movieId -> rating (1-10)
   * @param {string[]} candidateMovieIds
   * @returns {Object<string, number>} movieId -> score (0-1). Movies with
   *   no signal are omitted; caller should treat missing as 0.
   */
  predictScores(userId, knownRatings, candidateMovieIds) {
    if (!this.usable || !knownRatings || Object.keys(knownRatings).length === 0) {
      return {};
    }

    const ratedIds = Object.keys(knownRatings).filter((mid) => this.itemSimilarity.has(mid));
    if (ratedIds.length === 0) return {};

    const uid = String(userId);
    const userMean = this.userMeans.has(uid)
      ? this.userMeans.get(uid)
      : Object.values(knownRatings).reduce((a, b) => a + b, 0) / Object.values(knownRatings).length;

    const results = {};
    for (const movieId of candidateMovieIds) {
      const mid = String(movieId);
      const simRow = this.itemSimilarity.get(mid);
      if (!simRow) continue;

      let numer = 0;
      let denom = 0;
      for (const ratedId of ratedIds) {
        const sim = simRow.get(ratedId) ?? 0;
        const weight = Math.abs(sim);
        if (weight === 0) continue;
        denom += weight;
        numer += sim * (knownRatings[ratedId] - userMean);
      }
      if (denom < 1e-9) continue;

      const predictedRating = userMean + numer / denom;
      const score = Math.max(0, Math.min(1, predictedRating / 10));
      results[mid] = score;
    }

    return results;
  }
}

module.exports = { CollaborativeModel };