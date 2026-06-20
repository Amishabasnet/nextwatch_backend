const toWatchlistEntryDTO = (entry) => ({
  id: entry._id,
  movie: entry.movie,
  notes: entry.notes || null,
  priority: entry.priority,
  addedAt: entry.createdAt,
});

const toWatchlistListDTO = (entries) => entries.map(toWatchlistEntryDTO);

module.exports = { toWatchlistEntryDTO, toWatchlistListDTO };
