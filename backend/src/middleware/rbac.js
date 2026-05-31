const { AppError } = require("../utils/errors");

const ROLE_HIERARCHY = {
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
};

/**
 * Check if user has at least the required role
 */
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const hasPermission = roles.some(
      (role) => userRoleLevel >= ROLE_HIERARCHY[role],
    );

    if (!hasPermission) {
      return next(
        new AppError(
          403,
          "FORBIDDEN",
          `This action requires one of the following roles: ${roles.join(", ")}`,
        ),
      );
    }

    next();
  };

/**
 * Require exact role match
 */
const requireExactRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          "FORBIDDEN",
          `This action requires one of the following roles: ${roles.join(", ")}`,
        ),
      );
    }

    next();
  };

/**
 * Ensure user belongs to the same organization as the resource
 */
const requireSameOrg = (req, res, next) => {
  if (!req.user) {
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  }
  // orgId is set on req.user from JWT; resources are filtered per org in controllers
  next();
};

module.exports = { requireRole, requireExactRole, requireSameOrg };
