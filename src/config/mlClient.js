const axios = require('axios');

const mlClient = axios.create({
  baseURL: process.env.ML_API_URL || 'http://localhost:8000',
  timeout: parseInt(process.env.ML_API_TIMEOUT, 10) || 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

mlClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ML Client] → ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

mlClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.detail || error.message;

    if (error.code === 'ECONNREFUSED') {
      console.error('[ML Client] ML service is unreachable. Is the Python FastAPI server running?');
    } else if (error.code === 'ECONNABORTED') {
      console.error(`[ML Client] Request timed out after ${process.env.ML_API_TIMEOUT || 10000}ms`);
    } else {
      console.error(`[ML Client] Error ${status}: ${message}`);
    }

    return Promise.reject(error);
  }
);

module.exports = mlClient;
