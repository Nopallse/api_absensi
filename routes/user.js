const express = require("express");
const router = express.Router();
const { requireAuth, requireUserDeviceCheck } = require("../middlewares/authMiddleware");
const {getAttendanceHistory ,getKehadiranToday,createKehadiran } = require("../controllers/kehadiranController");
const { getUser,saveFcmToken, resetDeviceId, getMyLocation } = require("../controllers/userController");
const { getKetidakhadiran,  createKetidakhadiran } = require("../controllers/ketidakhadiranController");
const { resetDeviceSelf, registerNewDevice, requestDeviceReset, getMyResetRequests } = require("../controllers/deviceResetController");

// Semua routes memerlukan authentication
router.use(requireAuth());

// Middleware untuk mengecek device_id (hanya untuk user, bukan admin)
router.use(requireUserDeviceCheck());

router.get("/", getUser);
router.get("/kehadiran",getAttendanceHistory)
router.post("/kehadiran", createKehadiran);
router.get("/kehadiran/today", getKehadiranToday);
router.get("/lokasi", getMyLocation);
router.get("/ketidakhadiran", getKetidakhadiran);
router.post("/ketidakhadiran", createKetidakhadiran);
router.post("/fcm-token", saveFcmToken);

// Device reset routes
router.post("/device-reset", resetDeviceSelf); 
router.post("/device-reset/request", requestDeviceReset); 
router.get("/device-reset/requests", getMyResetRequests);
router.post("/device-register", registerNewDevice);

module.exports = router;
