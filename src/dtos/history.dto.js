const toHistoryDTO = (history) => ({
  id: history._id,
  movie: history.movie,
  watchedAt: history.watchedAt,
  rating: history.rating,
  review: history.review,
  completed: history.completed,
  createdAt: history.createdAt,
});

const toHistoryListDTO = (records) => records.map(toHistoryDTO);

module.exports = { toHistoryDTO, toHistoryListDTO };
