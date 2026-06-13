const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
    ];

    // Allow requests from the frontend and tools such as Postman or mobile apps
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },

  // Allow cookies and authentication information to be included in requests
  credentials: true,

  // HTTP request methods accepted by the server
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Headers that the frontend is allowed to send
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = corsOptions;