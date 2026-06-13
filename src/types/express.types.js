const apiResponse = (success, message, data = null) => ({
  success,
  message,
  data,
});

const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

module.exports = { apiResponse, paginationMeta };
