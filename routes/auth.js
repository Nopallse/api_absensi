const express = require("express");
const { login, loginAdmin, refreshToken, logout, logoutAll } = require("../controllers/authController");
const { requireJWT } = require("../middlewares/authMiddleware");
const { adminAuthLogMiddleware } = require("../middlewares/adminLogMiddleware");
const { requestDeviceResetWithoutLogin, registerNewDevice } = require("../controllers/deviceResetController");
const router = express.Router();

router.post("/login", login);
router.post("/admin/login", adminAuthLogMiddleware, loginAdmin);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/logout-all", requireJWT(), logoutAll);

// Device reset request tanpa login
router.post("/device-reset/request", requestDeviceResetWithoutLogin);

module.exports = router;
