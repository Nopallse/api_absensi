const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");
const {getAttendanceHistory ,getKehadiranToday,createKehadiran } = require("../controllers/kehadiranController");
const { getUser,saveFcmToken, getMyLocation } = require("../controllers/userController");
const { getKetidakhadiran,  createKetidakhadiran } = require("../controllers/ketidakhadiranController");

// Semua routes memerlukan authentication
router.use(requireAuth());

router.get("/", getUser);
router.get("/kehadiran",getAttendanceHistory)
router.post("/kehadiran", createKehadiran);
router.get("/kehadiran/today", getKehadiranToday);
router.get("/lokasi", getMyLocation);
router.get("/ketidakhadiran", getKetidakhadiran);
router.post("/ketidakhadiran", createKetidakhadiran);
router.post("/fcm-token", saveFcmToken);

module.exports = router;
