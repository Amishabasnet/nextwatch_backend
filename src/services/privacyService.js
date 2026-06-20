const UserRepository = require('../repositories/userRepository');
const HistoryRepository = require('../repositories/historyRepository');
const Rating = require('../models/Rating');
const Preference = require('../models/Preference');
const RecommendationFeedback = require('../models/RecommendationFeedback');
const { NotFoundError, UnauthorizedError, ValidationError } = require('../errors/AppError');

const PrivacyService = {
  async deleteAccount(userId, password) {
    const user = await UserRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User not found');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Incorrect password. Account deletion cancelled.');
    }

    await Promise.all([
      HistoryRepository.clearAll(userId),
      Rating.deleteMany({ userId }),
      Preference.deleteMany({ user: userId }),
      RecommendationFeedback.deleteMany({ userId }),
    ]);

    await UserRepository.delete(userId);

    return {
      message: 'Account and all associated personal data have been permanently deleted.',
      deletedAt: new Date().toISOString(),
    };
  },

  async clearViewingHistory(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const result = await HistoryRepository.clearAll(userId);

    return {
      message: 'Viewing history has been permanently cleared.',
      deletedCount: result.deletedCount ?? 0,
      clearedAt: new Date().toISOString(),
    };
  },

  async updateConsent(userId, consentGiven, withdrawalReason) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const updated = await UserRepository.updateConsent(userId, consentGiven, withdrawalReason);

    return {
      userId: updated._id,
      consentGiven: updated.consentGiven,
      consentDate: updated.consentDate,
      ...(withdrawalReason && !consentGiven && { withdrawalReason }),
      message: consentGiven
        ? 'Consent granted. Your data will be used to personalise recommendations.'
        : 'Consent withdrawn. Your data will no longer be used for personalisation.',
    };
  },
};

module.exports = PrivacyService;
