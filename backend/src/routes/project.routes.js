const router = require("express").Router();
const {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} = require("../controllers/project.controller");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/rbac");
const { body } = require("express-validator");
const { validate } = require("../middleware/validate");

router.use(authenticate);

const projectValidator = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Project name is required"),
  body("description").optional().trim().isLength({ max: 2000 }),
];

router.get("/", listProjects);
router.post(
  "/",
  requireRole("MANAGER", "ADMIN"),
  projectValidator,
  validate,
  createProject,
);
router.put(
  "/:id",
  requireRole("MANAGER", "ADMIN"),
  projectValidator,
  validate,
  updateProject,
);
router.delete("/:id", requireRole("ADMIN"), deleteProject);

module.exports = router;
