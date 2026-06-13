// Send a consistent success response to the client
const sendResponse = (res, statusCode, data, message = 'Success') => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// Arrange the results and pagination details in one response
const paginatedResponse = (data, total, page, limit) => ({
  results: data,
  pagination: {
    total,
    page: Number(page),
    limit: Number(limit),

    // Calculate the total number of available pages
    totalPages: Math.ceil(total / limit),
  },
});

module.exports = {
  sendResponse,
  paginatedResponse,
};