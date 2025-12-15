const express = require("express");
const { login, loginAdmin, refreshToken, logout, checkResetRequest } = require("../controllers/authController");
const { requireJWT } = require("../middlewares/authMiddleware");
const { requestDeviceResetWithoutLogin, registerNewDevice } = require("../controllers/deviceResetController");
const router = express.Router();

router.post("/login", login);
router.post("/admin/login", loginAdmin);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

// Device reset request tanpa login
router.post("/device-reset/request", requestDeviceResetWithoutLogin);
router.post("/device-reset/check", checkResetRequest);

module.exports = router;
