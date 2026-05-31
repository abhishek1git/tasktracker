const { validationResult } = require("express-validator");
const { errorResponse } = require("../utils/errors");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return errorResponse(
      res,
      400,
      "VALIDATION_ERROR",
      firstError.msg,
      errors.array(),
    );
  }
  next();
};

module.exports = { validate };
