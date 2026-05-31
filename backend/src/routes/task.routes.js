const router = require("express").Router();
const {
  listTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getAnalytics,
} = require("../controllers/task.controller");
const {
  createTaskValidator,
  updateTaskValidator,
  updateStatusValidator,
  listTasksValidator,
} = require("../validators/task.validator");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/rbac");

// All task routes require authentication
router.use(authenticate);

router.get("/analytics", requireRole("MANAGER", "ADMIN"), getAnalytics);
router.get("/", listTasksValidator, validate, listTasks);
router.get("/:id", getTask);
router.post(
  "/",
  requireRole("MANAGER", "ADMIN"),
  createTaskValidator,
  validate,
  createTask,
);
router.put(
  "/:id",
  requireRole("MANAGER", "ADMIN"),
  updateTaskValidator,
  validate,
  updateTask,
);
router.patch("/:id/status", updateStatusValidator, validate, updateTaskStatus);
router.delete("/:id", requireRole("ADMIN"), deleteTask);

module.exports = router;
