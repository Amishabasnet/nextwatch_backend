const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { apiResponse } = require('../types/express.types');
const User = require('../models/User');

const router = express.Router();

router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('consentGiven consentDate');
    if (!user) return res.status(404).json(apiResponse(false, 'User not found', null));
    res.status(200).json(apiResponse(true, 'Consent fetched', {
      consentGiven: user.consentGiven,
      consentDate:  user.consentDate,
    }));
  } catch (err) { next(err); }
});

router.put('/:userId', authenticate, async (req, res, next) => {
  try {
    const { consentGiven } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { consentGiven: Boolean(consentGiven), consentDate: consentGiven ? new Date() : null },
      { new: true, select: 'consentGiven consentDate' }
    );
    if (!user) return res.status(404).json(apiResponse(false, 'User not found', null));
    res.status(200).json(apiResponse(true, 'Consent updated', {
      consentGiven: user.consentGiven,
      consentDate:  user.consentDate,
    }));
  } catch (err) { next(err); }
});

module.exports = router;