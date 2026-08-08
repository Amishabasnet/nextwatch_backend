const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nextwatch';

  if (!process.env.MONGO_URI) {
    console.warn('Warning: MONGO_URI is not defined. Falling back to local MongoDB at mongodb://127.0.0.1:27017/nextwatch.');
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
