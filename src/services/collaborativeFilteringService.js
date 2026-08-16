
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
      const midA = movieIds[i];
      itemSimilarity.get(midA).set(midA, 1.0);
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

module.exports = { CollaborativeModel };
module.exports = { CollaborativeModel, MIN_OVERLAP_USERS };
