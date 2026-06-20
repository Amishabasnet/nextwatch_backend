const MLPerformanceRepository = require('../repositories/mlPerformanceRepository');
const { toMLPerformanceDTO } = require('../dtos/mlPerformance.dto');

const MLPerformanceService = {
  async getMLPerformance() {
    const [
      averageRatingData,
      ctrData,
      mostLiked,
      irrelevant,
      satisfactionData,
      feedbackCount,
      trend,
    ] = await Promise.all([
      MLPerformanceRepository.getAverageUserRating(),
      MLPerformanceRepository.getClickThroughRate(),
      MLPerformanceRepository.getMostLikedRecommendations(10),
      MLPerformanceRepository.getIrrelevantRecommendations(10),
      MLPerformanceRepository.getUserSatisfactionScore(),
      MLPerformanceRepository.getTotalFeedbackCount(),
      MLPerformanceRepository.getPerformanceTrend(30),
    ]);

    return toMLPerformanceDTO({
      averageRatingData,
      ctrData,
      mostLiked,
      irrelevant,
      satisfactionData,
      feedbackCount,
      trend,
    });
  },
};

module.exports = MLPerformanceService;
