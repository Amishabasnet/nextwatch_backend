require('dotenv').config();
const app = require('./server');
const connectDB = require('./database/connection');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`NextWatch server running on port ${PORT}`);
  });
};

startServer();
