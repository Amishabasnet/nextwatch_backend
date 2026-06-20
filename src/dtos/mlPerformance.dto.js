const toMLPerformanceDTO = ({
  averageRatingData,
  ctrData,
  mostLiked,
  irrelevant,
  satisfactionData,
  feedbackCount,
  trend,
}) => ({

  summary: {
    averageUserRating: {
      value: averageRatingData.averageRating,
      outOf: 10,
      totalRatings: averageRatingData.totalRatings,
      label: 'Average User Rating',
    },
    clickThroughRate: {
      value: ctrData.clickThroughRate,
      unit: '%',
      totalClicked: ctrData.totalClicked,
      totalShown: ctrData.totalShown,
      label: 'Recommendation Click-Through Rate',
    },
    userSatisfactionScore: {
      value: satisfactionData.satisfactionScore,
      unit: '%',
      totalLiked: satisfactionData.totalLiked,
      totalDisliked: satisfactionData.totalDisliked,
      totalIrrelevant: satisfactionData.totalIrrelevant,
      label: 'User Satisfaction Score',
      note: 'Calculated from explicit liked / disliked signals only',
    },
    totalFeedback: {
      total: feedbackCount.total,
      breakdown: {
        clicked: feedbackCount.clicked,
        liked: feedbackCount.liked,
        disliked: feedbackCount.disliked,
        markedIrrelevant: feedbackCount.markedIrrelevant,
      },
      label: 'Total Feedback Count',
    },
  },

  mostLikedRecommendations: mostLiked.map((m) => ({
    movieId: m.movieId,
    title: m.title,
    genres: m.genres,
    posterUrl: m.posterUrl,
    releaseYear: m.releaseYear,
    likeCount: m.likeCount,
    likeRate: `${m.likeRate}%`,
  })),

  irrelevantRecommendations: irrelevant.map((m) => ({
    movieId: m.movieId,
    title: m.title,
    genres: m.genres,
    posterUrl: m.posterUrl,
    releaseYear: m.releaseYear,
    irrelevantCount: m.irrelevantCount,
    irrelevantRate: `${m.irrelevantRate}%`,
    topReasons: m.topReasons ?? [],
  })),
  performanceTrend: {
    periodDays: 30,
    data: trend,
  },

  generatedAt: new Date().toISOString(),
});

module.exports = { toMLPerformanceDTO };
