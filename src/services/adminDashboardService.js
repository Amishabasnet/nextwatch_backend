const AdminDashboardRepository = require('../repositories/adminDashboardRepository');
const { toAdminDashboardDTO } = require('../dtos/adminDashboard.dto');

const AdminDashboardService = {
  async getDashboard() {
    const [
      totalUsers,
      totalMovies,
      totalRatings,
      mostSelectedMood,
      mostWatchedGenre,
      mostRecommendedMovies,
      recommendationActivityTrend,
      moodGenreBehaviour,
      topRecommendedMovies,
      recentUserActivity,
    ] = await Promise.all([
      AdminDashboardRepository.countUsers(),
      AdminDashboardRepository.countMovies(),
      AdminDashboardRepository.countRatings(),
      AdminDashboardRepository.getMostSelectedMood(),
      AdminDashboardRepository.getMostWatchedGenre(),
      AdminDashboardRepository.getMostRecommendedMovies(),
      AdminDashboardRepository.getRecommendationActivityTrend(),
      AdminDashboardRepository.getMoodGenreBehaviour(),
      AdminDashboardRepository.getTopRecommendedMovies(),
      AdminDashboardRepository.getRecentUserActivity(),
    ]);

    const userEngagement = await AdminDashboardRepository.getUserEngagementSummary(totalUsers);

    return toAdminDashboardDTO({
      totalUsers,
      totalMovies,
      totalRatings,
      mostSelectedMood,
      mostWatchedGenre,
      mostRecommendedMovies,
      userEngagement,
      recommendationActivityTrend,
      moodGenreBehaviour,
      topRecommendedMovies,
      recentUserActivity,
    });
  },
};

module.exports = AdminDashboardService;
