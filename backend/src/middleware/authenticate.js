const { verifyAccessToken } = require("../utils/jwt");
const { AppError } = require("../utils/errors");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Access token required"));
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      orgId: decoded.orgId,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(
        new AppError(401, "TOKEN_EXPIRED", "Access token has expired"),
      );
    }
    return next(new AppError(401, "INVALID_TOKEN", "Invalid access token"));
  }
};

module.exports = { authenticate };
