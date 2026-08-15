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

  // ── Admin user management ──
  async findAllAdmin({ page = 1, limit = 20, search, role, status } = {}) {
    const filters = {};
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filters.$or = [{ name: rx }, { email: rx }];
    }
    if (role) filters.role = role;
    if (status) filters.status = status;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filters),
    ]);
    return { users, total };
  },

  async updateRole(id, role) {
    return User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true });
  },

  async updateStatus(id, status) {
    return User.findByIdAndUpdate(
      id,
      { status, ...(status === 'suspended' ? { refreshTokens: [] } : {}) },
      { new: true, runValidators: true }
    );
  },
};

module.exports = UserRepository;
