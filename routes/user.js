const express = require("express");
const router = express.Router();
const { requireAuth, requireUserDeviceCheck } = require("../middlewares/authMiddleware");
const { validateHMAC } = require("../middlewares/hmacMiddleware");
const {getAttendanceHistory ,getKehadiranBiasaToday, getKehadiranKegiatanToday, 
    createKehadiranBiasa, createKehadiranKegiatan, getKehadiranKegiatan } = require("../controllers/kehadiranController");
const { getUser, getKehadiranDanLokasi } = require("../controllers/userController");
const { resetDeviceSelf, registerNewDevice, requestDeviceReset, getMyResetRequests } = require("../controllers/deviceResetController");

router.use(requireAuth());

router.use(requireUserDeviceCheck());

router.get("/", getUser);

router.get("/kehadiran-lokasi", getKehadiranDanLokasi);

router.get("/kehadiran/biasa", getAttendanceHistory);
router.get("/kehadiran/biasa/today", getKehadiranBiasaToday);
router.post("/kehadiran/biasa", validateHMAC(), createKehadiranBiasa);
router.post("/kehadiran/biasa/tanpa-hmac", createKehadiranBiasa);

router.get("/kehadiran/kegiatan/today", getKehadiranKegiatanToday);
router.get("/kehadiran/kegiatan", getKehadiranKegiatan);
router.post("/kehadiran/kegiatan", validateHMAC(), createKehadiranKegiatan);

router.post("/device-reset", resetDeviceSelf); 
router.post("/device-reset/request", requestDeviceReset); 
router.get("/device-reset/requests", getMyResetRequests);
router.post("/device-register", registerNewDevice);

module.exports = router;
