const { ForbiddenError } = require('../errors/AppError');
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required before authorization'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`)
      );
    }

    next();
  };
};

module.exports = { authorize };
