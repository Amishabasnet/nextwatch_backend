const toAdminDashboardDTO = (raw) => ({
  totals: {
    totalUsers: raw.totalUsers,
    totalMovies: raw.totalMovies,
    totalRatings: raw.totalRatings,
  },
  mostSelectedMood: raw.mostSelectedMood,
  mostWatchedGenre: raw.mostWatchedGenre,
  mostRecommendedMovies: raw.mostRecommendedMovies,
  userEngagement: raw.userEngagement,
  generatedAt: new Date().toISOString(),
});

module.exports = { toAdminDashboardDTO };
