const Preference = require('../models/Preference');

const PreferenceRepository = {
  async findByUser(userId) {
    return Preference.findOne({ user: userId });
  },

  async upsert(userId, data) {
    return Preference.findOneAndUpdate(
      { user: userId },
      { ...data, user: userId },
      { new: true, upsert: true, runValidators: true }
    );
  },

  async delete(userId) {
    return Preference.findOneAndDelete({ user: userId });
  },
};

module.exports = PreferenceRepository;
