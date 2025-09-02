const express = require("express");
const { login, loginAdminOpd, refreshToken, logout, logoutAll } = require("../controllers/authController");
const { requireJWT } = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/login", login);
router.post("/admin-opd/login", loginAdminOpd);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/logout-all", requireJWT(), logoutAll);

module.exports = router;
