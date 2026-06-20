const { ForbiddenError } = require('../errors/AppError');
const authorizeSelf = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (req.user.role === 'admin') return next();

    const targetId = req.params[paramName];
    if (req.user._id.toString() !== targetId) {
      return next(new ForbiddenError('You are not authorized to access this resource'));
    }

    next();
  };
};

module.exports = { authorizeSelf };
