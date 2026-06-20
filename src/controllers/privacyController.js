const PrivacyService = require('../services/privacyService');
const { apiResponse } = require('../types/express.types');
const PrivacyController = {
  async deleteAccount(req, res, next) {
    try {
      const result = await PrivacyService.deleteAccount(
        req.params.userId,
        req.body.password
      );
      res.status(200).json(apiResponse(true, result.message, {
        deletedAt: result.deletedAt,
      }));
    } catch (error) {
      next(error);
    }
  },

  async clearHistory(req, res, next) {
    try {
      const result = await PrivacyService.clearViewingHistory(req.params.userId);
      res.status(200).json(apiResponse(true, result.message, {
        deletedCount: result.deletedCount,
        clearedAt: result.clearedAt,
      }));
    } catch (error) {
      next(error);
    }
  },

  async updateConsent(req, res, next) {
    try {
      const { consentGiven, withdrawalReason } = req.body;
      const result = await PrivacyService.updateConsent(
        req.params.userId,
        consentGiven,
        withdrawalReason
      );
      res.status(200).json(apiResponse(true, result.message, result));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = PrivacyController;
