const express = require("express");
const router = express.Router();
const { requireAuth, requireUserDeviceCheck } = require("../middlewares/authMiddleware");
const {getAttendanceHistory ,getKehadiranToday,createKehadiran, createKehadiranKegiatan, getKehadiranKegiatan } = require("../controllers/kehadiranController");
const { getUser,saveFcmToken, resetDeviceId, getMyLocation, getTodayActivitiesEndpoint } = require("../controllers/userController");
const { resetDeviceSelf, registerNewDevice, requestDeviceReset, getMyResetRequests } = require("../controllers/deviceResetController");

// Semua routes memerlukan authentication
router.use(requireAuth());

// Middleware untuk mengecek device_id (hanya untuk user, bukan admin)
router.use(requireUserDeviceCheck());

router.get("/", getUser);
router.get("/kehadiran",getAttendanceHistory)
router.post("/kehadiran", createKehadiran);
router.get("/kehadiran/today", getKehadiranToday);
router.post("/kehadiran/kegiatan", createKehadiranKegiatan);

router.get("/kehadiran/kegiatan", getKehadiranKegiatan);


router.get("/lokasi", getMyLocation);
router.post("/fcm-token", saveFcmToken);

// Device reset routes
router.post("/device-reset", resetDeviceSelf); 
router.post("/device-reset/request", requestDeviceReset); 
router.get("/device-reset/requests", getMyResetRequests);
router.post("/device-register", registerNewDevice);

module.exports = router;
