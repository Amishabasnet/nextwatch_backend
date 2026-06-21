const User = require('../models/User');

const UserRepository = {
  async create(data) {
    return User.create(data);
  },

  async findById(id) {
    return User.findById(id);
  },

  async findByEmail(email) {
    return User.findOne({ email }).select('+password');
  },

  async findByIdWithPassword(id) {
    return User.findById(id).select('+password');
  },

  async findByIdAndUpdate(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  async updateConsent(id, consentGiven) {
    return User.findByIdAndUpdate(
      id,
      { consentGiven, consentDate: new Date() },
      { new: true, runValidators: true }
    );
  },

  async delete(id) {
    return User.findByIdAndDelete(id);
  },
};

module.exports = UserRepository;
