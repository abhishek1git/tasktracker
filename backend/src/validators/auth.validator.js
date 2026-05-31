const { body } = require("express-validator");

const registerValidator = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and a number"),
  body("full_name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be 2-100 characters"),
  body("organization_name")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Organization name must be 2-100 characters"),
  body("organization_id")
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage("organization_id must be a valid UUID"),
  // Custom: require at least one of the two
  body("organization_name").custom((value, { req }) => {
    if (!value && !req.body.organization_id) {
      throw new Error(
        "Either organization_name (to create) or organization_id (to join) is required",
      );
    }
    return true;
  }),
];

const loginValidator = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const refreshValidator = [
  body("refresh_token").notEmpty().withMessage("Refresh token is required"),
];

module.exports = { registerValidator, loginValidator, refreshValidator };
