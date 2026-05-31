class AppError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const errorResponse = (res, status, code, message, details = null) => {
  const body = { status, code, message };
  if (details) body.details = details;
  return res.status(status).json(body);
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const globalErrorHandler = (err, req, res, next) => {
  // Always log the full stack in non-production
  if (process.env.NODE_ENV !== "production") {
    console.error("Unhandled error:", err.stack || err.message);
  } else {
    console.error("Error:", err.message);
  }

  if (err instanceof AppError) {
    return errorResponse(res, err.status, err.code, err.message, err.details);
  }

  // PostgreSQL errors
  if (err.code === "23505") {
    return errorResponse(res, 409, "CONFLICT", "Resource already exists");
  }
  if (err.code === "23503") {
    return errorResponse(
      res,
      400,
      "INVALID_REFERENCE",
      "Referenced resource not found",
    );
  }
  if (err.code === "22P02") {
    return errorResponse(res, 400, "INVALID_INPUT", "Invalid UUID format");
  }
  if (err.code === "42703") {
    return errorResponse(
      res,
      500,
      "DB_ERROR",
      "Database column error: " + err.message,
    );
  }

  return errorResponse(
    res,
    500,
    "INTERNAL_ERROR",
    process.env.NODE_ENV !== "production"
      ? err.message
      : "An unexpected error occurred",
  );
};

module.exports = { AppError, errorResponse, asyncHandler, globalErrorHandler };
