const router = require("express").Router();
const {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller");
const { authenticate } = require("../middleware/authenticate");
const { requireRole } = require("../middleware/rbac");
const { body } = require("express-validator");
const { validate } = require("../middleware/validate");

router.use(authenticate);

const updateUserValidator = [
  body("full_name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be 2-100 characters"),
  body("role")
    .optional()
    .isIn(["ADMIN", "MANAGER", "MEMBER"])
    .withMessage("Role must be ADMIN, MANAGER, or MEMBER"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

router.get("/", requireRole("MANAGER", "ADMIN"), listUsers);
router.get("/:id", requireRole("MANAGER", "ADMIN"), getUser);
router.put("/:id", updateUserValidator, validate, updateUser);
router.delete("/:id", requireRole("ADMIN"), deleteUser);

module.exports = router;
