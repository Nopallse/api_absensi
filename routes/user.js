const express = require("express");
const router = express.Router();
const { requireAuth, requireUserDeviceCheck } = require("../middlewares/authMiddleware");
const {getAttendanceHistory ,getKehadiranBiasaToday, getKehadiranKegiatanToday, createKehadiranBiasa, createKehadiranKegiatan, getKehadiranKegiatan } = require("../controllers/kehadiranController");
const { getUser,saveFcmToken, resetDeviceId, getKehadiranDanLokasi } = require("../controllers/userController");
const { resetDeviceSelf, registerNewDevice, requestDeviceReset, getMyResetRequests } = require("../controllers/deviceResetController");

// Semua routes memerlukan authentication
router.use(requireAuth());

// Middleware untuk mengecek device_id (hanya untuk user, bukan admin)
router.use(requireUserDeviceCheck());

router.get("/", getUser);

// Kehadiran dan Lokasi (GABUNGAN)
router.get("/kehadiran-lokasi", getKehadiranDanLokasi);

// Kehadiran Biasa (TERPISAH)
router.get("/kehadiran/biasa", getAttendanceHistory);
router.get("/kehadiran/biasa/today", getKehadiranBiasaToday);
router.post("/kehadiran/biasa", createKehadiranBiasa);

// Kehadiran Kegiatan (TERPISAH)
router.get("/kehadiran/kegiatan/today", getKehadiranKegiatanToday);
router.get("/kehadiran/kegiatan", getKehadiranKegiatan);
router.post("/kehadiran/kegiatan", createKehadiranKegiatan);




router.post("/fcm-token", saveFcmToken);

// Device reset routes
router.post("/device-reset", resetDeviceSelf); 
router.post("/device-reset/request", requestDeviceReset); 
router.get("/device-reset/requests", getMyResetRequests);
router.post("/device-register", registerNewDevice);

module.exports = router;
