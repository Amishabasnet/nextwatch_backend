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

  async findByIdAndUpdate(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  async delete(id) {
    return User.findByIdAndDelete(id);
  },
};

module.exports = UserRepository;
