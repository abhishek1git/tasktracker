const router = require("express").Router();
const {
  register,
  login,
  refresh,
  logout,
  me,
} = require("../controllers/auth.controller");
const {
  registerValidator,
  loginValidator,
  refreshValidator,
} = require("../validators/auth.validator");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/authenticate");

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.post("/refresh", refreshValidator, validate, refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);

module.exports = router;
