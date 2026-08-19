'use strict';

const MIN_OVERLAP_USERS = 2;

function _cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

class CollaborativeModel {
  /**
   * @param {Array<{userId: string, movieId: string, rating: number}>} allRatings
   *   Platform-wide (user, movie, rating) triples.
   */
  constructor(allRatings = []) {
    this.itemSimilarity = null; // Map<movieId, Map<movieId, number>>
    this.userMeans = null;      // Map<userId, number>
    this.isUsable = false;

    const cleaned = (allRatings ?? []).filter(
      (r) => r && r.userId != null && r.movieId != null && r.rating != null
    );
    if (cleaned.length < 2) return;

    // Deduplicate (user, movie) pairs, keeping the last occurrence, same
    // as the Python side's drop_duplicates(keep='last').
    const dedupMap = new Map();
    for (const r of cleaned) {
      dedupMap.set(`${r.userId}::${r.movieId}`, r);
    }
    const ratings = [...dedupMap.values()];

    // Build user -> movie -> rating matrix.
    const userIds = [...new Set(ratings.map((r) => String(r.userId)))];
    const movieIds = [...new Set(ratings.map((r) => String(r.movieId)))];
    if (userIds.length < 2 || movieIds.length < 2) return;

    const matrix = new Map(); // userId -> Map<movieId, rating>
    for (const uid of userIds) matrix.set(uid, new Map());
    for (const r of ratings) {
      matrix.get(String(r.userId)).set(String(r.movieId), r.rating);
    }

    // Mean-center each user's row.
    const userMeans = new Map();
    for (const uid of userIds) {
      const row = matrix.get(uid);
      const vals = [...row.values()];
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      userMeans.set(uid, mean);
    }
    this.userMeans = userMeans;

    // Build dense mean-centered vectors per movie (0 where unrated), plus
    // an overlap-count matrix so noisy single-user "similarities" get
    // zeroed out.
    const centeredByMovie = new Map(); // movieId -> array aligned to userIds
    const ratedByMovie = new Map();    // movieId -> Set(userId) who rated it
    for (const mid of movieIds) {
      centeredByMovie.set(mid, new Array(userIds.length).fill(0));
      ratedByMovie.set(mid, new Set());
    }
    userIds.forEach((uid, uIdx) => {
      const row = matrix.get(uid);
      const mean = userMeans.get(uid);
      for (const [mid, rating] of row.entries()) {
        centeredByMovie.get(mid)[uIdx] = rating - mean;
        ratedByMovie.get(mid).add(uid);
      }
    });

    // Item-item cosine similarity, gated by MIN_OVERLAP_USERS.
    const itemSimilarity = new Map();
    for (const mid of movieIds) itemSimilarity.set(mid, new Map());

    for (let i = 0; i < movieIds.length; i++) {
      const midA = movieIds[i];
      itemSimilarity.get(midA).set(midA, 1.0); // diagonal

      for (let j = i + 1; j < movieIds.length; j++) {
        const midB = movieIds[j];

        let overlap = 0;
        for (const uid of ratedByMovie.get(midA)) {
          if (ratedByMovie.get(midB).has(uid)) overlap++;
        }

        let sim = 0;
        if (overlap >= MIN_OVERLAP_USERS) {
          sim = _cosineSimilarity(centeredByMovie.get(midA), centeredByMovie.get(midB));
        }

        itemSimilarity.get(midA).set(midB, sim);
        itemSimilarity.get(midB).set(midA, sim);
      }
    }

    this.itemSimilarity = itemSimilarity;
    this.isUsable = true;
  }

  /**
   * Returns { [movieId]: score_0_to_1 } for every candidate movie the
   * model has an opinion on. Movies with no signal are simply omitted -
   * callers should treat a missing entry as 0.
   *
   * @param {string} userId
   * @param {Object<string, number>} knownRatings - this user's own (movieId -> rating) map
   * @param {string[]} candidateMovieIds
   */
  predictScores(userId, knownRatings = {}, candidateMovieIds = []) {
    if (!this.isUsable) return {};

    const ratedIds = Object.keys(knownRatings).filter((mid) => this.itemSimilarity.has(mid));
    if (ratedIds.length === 0) return {};

    const uid = String(userId);
    const userMean = this.userMeans.has(uid)
      ? this.userMeans.get(uid)
      : Object.values(knownRatings).reduce((a, b) => a + b, 0) / Object.values(knownRatings).length;

    const results = {};
    for (const movieId of candidateMovieIds) {
      const mid = String(movieId);
      if (!this.itemSimilarity.has(mid)) continue;

      const simsForMovie = this.itemSimilarity.get(mid);
      let numer = 0;
      let denom = 0;
      for (const rid of ratedIds) {
        const sim = simsForMovie.get(rid) ?? 0;
        denom += Math.abs(sim);
        numer += sim * (knownRatings[rid] - userMean);
      }
      if (denom < 1e-9) continue;

      const predictedRating = userMean + numer / denom;
      const score = Math.max(0, Math.min(1, predictedRating / 10));
      results[mid] = score;
    }

    return results;
  }
}

module.exports = { CollaborativeModel, MIN_OVERLAP_USERS };