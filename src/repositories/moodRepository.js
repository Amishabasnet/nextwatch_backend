const Mood = require('../models/Mood');

const MoodRepository = {
  async create(data) {
    return Mood.create(data);
  },

  async findByUser(userId) {
    return Mood.find({ user: userId }).sort({ createdAt: -1 });
  },

  async findLatestByUser(userId) {
    return Mood.findOne({ user: userId }).sort({ createdAt: -1 });
  },

  async findById(id) {
    return Mood.findById(id);
  },

  async delete(id) {
    return Mood.findByIdAndDelete(id);
  },
};

module.exports = MoodRepository;
