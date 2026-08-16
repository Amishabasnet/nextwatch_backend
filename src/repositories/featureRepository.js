const Feature = require('../models/Feature');

const FeatureRepository = {
  async create(data) {
    return Feature.create(data);
  },

  async findActive() {
    const now = new Date();
    return Feature.find({
      isActive: true,
      activeFrom: { $lte: now },
      $or: [{ activeTo: null }, { activeTo: { $gte: now } }],
    })
      .populate('movie')
      .sort({ priority: -1 });
  },

  // Admin management view: every feature entry regardless of active window,
  // so an admin can see and toggle/edit ones that are scheduled, expired,
  // or turned off — not just what's currently live on the homepage.
  async findAll() {
    return Feature.find({})
      .populate('movie')
      .populate('featuredBy', 'name email')
      .sort({ priority: -1, createdAt: -1 });
  },

  async findById(id) {
    return Feature.findById(id).populate('movie');
  },

  async update(id, data) {
    return Feature.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  },

  async delete(id) {
    return Feature.findByIdAndDelete(id);
  },
};

module.exports = FeatureRepository;
