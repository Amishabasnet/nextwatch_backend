require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nextwatch';

async function makeAdmin(email) {
  if (!email) {
    console.error('Usage: node src/seeds/makeAdmin.js <email>');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { role: 'admin', status: 'active' },
    { new: true }
  );

  if (!user) {
    console.error('No user found with email "' + email + '". Register the account first, then run this script.');
    process.exit(1);
  }

  console.log('OK: ' + user.email + ' is now an admin.');
  await mongoose.disconnect();
  process.exit(0);
}

makeAdmin(process.argv[2]);
