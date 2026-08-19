const UserRepository = require('../repositories/userRepository');
const HistoryRepository = require('../repositories/historyRepository');
const Rating = require('../models/Rating');
const Preference = require('../models/Preference');
const RecommendationFeedback = require('../models/RecommendationFeedback');
const Watchlist = require('../models/Watchlist');
const Mood = require('../models/Mood');
const { toAdminUserDTO, toAdminUserListDTO } = require('../dtos/adminUser.dto');
const { paginationMeta } = require('../types/express.types');
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = require('../errors/appError');

const AdminUserService = {
  // Lets an existing admin create a brand-new user who is already an admin,
  // instead of registering normally and then being promoted. Goes straight
  // through UserRepository.create (not AuthService.register) so it never
  // touches refresh tokens / auto-login — the new admin logs in themselves.
  async createAdmin({ name, email, phone = '', password }) {
    const existing = await UserRepository.findByEmail(email);
    if (existing) throw new ConflictError('Email already in use');

    const user = await UserRepository.create({
      name,
      email,
      phone,
      password,
      role: 'admin',
      status: 'active',
      consentGiven: true,
      consentDate: new Date(),
    });

    return toAdminUserDTO(user);
  },

  async getAllUsers({ page = 1, limit = 20, search, role, status } = {}) {
    const { users, total } = await UserRepository.findAllAdmin({ page, limit, search, role, status });
    const screenTimeMap = await HistoryRepository.getScreenTimeForUsers(users.map((u) => u._id));
    return {
      users: toAdminUserListDTO(users, screenTimeMap),
      meta: paginationMeta(page, limit, total),
    };
  },

  async getUserById(id) {
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    const screenTimeMap = await HistoryRepository.getScreenTimeForUsers([user._id]);
    return toAdminUserDTO(user, screenTimeMap[String(user._id)] || {});
  },

  async updateRole(actingAdminId, targetUserId, role) {
    if (!['user', 'admin'].includes(role)) {
      throw new ValidationError('role must be either "user" or "admin"');
    }
    if (String(actingAdminId) === String(targetUserId) && role !== 'admin') {
      throw new ForbiddenError('You cannot remove your own admin role.');
    }

    const user = await UserRepository.updateRole(targetUserId, role);
    if (!user) throw new NotFoundError('User not found');
    return toAdminUserDTO(user);
  },

  async updateStatus(actingAdminId, targetUserId, status) {
    if (!['active', 'suspended'].includes(status)) {
      throw new ValidationError('status must be either "active" or "suspended"');
    }
    if (String(actingAdminId) === String(targetUserId) && status === 'suspended') {
      throw new ForbiddenError('You cannot suspend your own account.');
    }

    const user = await UserRepository.updateStatus(targetUserId, status);
    if (!user) throw new NotFoundError('User not found');
    return toAdminUserDTO(user);
  },

  async deleteUser(actingAdminId, targetUserId) {
    if (String(actingAdminId) === String(targetUserId)) {
      throw new ForbiddenError('You cannot delete your own account from the admin panel.');
    }

    const user = await UserRepository.findById(targetUserId);
    if (!user) throw new NotFoundError('User not found');

    // Cascade cleanup so deleting a user doesn't leave orphaned references
    // across the app (history, ratings, watchlist, preferences, moods, feedback).
    await Promise.all([
      HistoryRepository.clearAll(targetUserId),
      Rating.deleteMany({ userId: targetUserId }),
      Preference.deleteMany({ user: targetUserId }),
      RecommendationFeedback.deleteMany({ userId: targetUserId }),
      Watchlist.deleteMany({ user: targetUserId }),
      Mood.deleteMany({ user: targetUserId }),
    ]);

    await UserRepository.delete(targetUserId);

    return { message: 'User and all associated data have been permanently deleted.' };
  },
};

module.exports = AdminUserService;
