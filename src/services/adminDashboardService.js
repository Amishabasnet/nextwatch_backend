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
    ] = await Promise.all([
      AdminDashboardRepository.countUsers(),
      AdminDashboardRepository.countMovies(),
      AdminDashboardRepository.countRatings(),
      AdminDashboardRepository.getMostSelectedMood(),
      AdminDashboardRepository.getMostWatchedGenre(),
      AdminDashboardRepository.getMostRecommendedMovies(),
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
    });
  },
};

module.exports = AdminDashboardService;
