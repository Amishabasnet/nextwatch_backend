/**
 * Sends a standardised success response
 */
const sendResponse = (res, statusCode, data, message = 'Success') => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Builds a paginated response object
 */
const paginatedResponse = (data, total, page, limit) => ({
  results: data,
  pagination: {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
  },
});

module.exports = { sendResponse, paginatedResponse };
