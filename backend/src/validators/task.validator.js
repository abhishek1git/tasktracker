const { body, query, param } = require("express-validator");

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const VALID_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];

const createTaskValidator = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Title is required and must be under 500 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description must be under 5000 characters"),
  body("priority")
    .optional()
    .isIn(VALID_PRIORITIES)
    .withMessage(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`),
  body("assignee_id")
    .optional()
    .isUUID()
    .withMessage("assignee_id must be a valid UUID"),
  body("project_id")
    .optional()
    .isUUID()
    .withMessage("project_id must be a valid UUID"),
  body("due_date")
    .optional()
    .isISO8601()
    .withMessage("due_date must be a valid ISO date")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("due_date must be a future date");
      }
      return true;
    }),
];

const updateTaskValidator = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Title must be under 500 characters"),
  body("description").optional().trim().isLength({ max: 5000 }),
  body("priority")
    .optional()
    .isIn(VALID_PRIORITIES)
    .withMessage(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`),
  body("assignee_id")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("assignee_id must be a valid UUID"),
  body("project_id")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("project_id must be a valid UUID"),
  body("due_date")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("due_date must be a valid ISO date")
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error("due_date must be a future date");
      }
      return true;
    }),
];

const updateStatusValidator = [
  body("status")
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(", ")}`),
];

const listTasksValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`status filter must be one of: ${VALID_STATUSES.join(", ")}`),
  query("priority")
    .optional()
    .isIn(VALID_PRIORITIES)
    .withMessage(
      `priority filter must be one of: ${VALID_PRIORITIES.join(", ")}`,
    ),
  query("assignee_id")
    .optional()
    .isUUID()
    .withMessage("assignee_id must be a valid UUID"),
];

module.exports = {
  createTaskValidator,
  updateTaskValidator,
  updateStatusValidator,
  listTasksValidator,
};
