const express = require("express");
const { getKehadiranByUserId, getAllKehadiran, getAttendanceHistory, getMonthlyReport, getKehadiranToday, createKehadiran, checkTodayAttendance, getUserAccessibleLocations, createKehadiranKegiatan, getKehadiranKegiatan } = require("../controllers/kehadiranController");
const router = express.Router();
const { requireAuth, requireAdminOpd } = require("../middlewares/authMiddleware");
const { getLokasi } = require("../controllers/lokasiController");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


// Routes untuk admin (level 1, 2, 3)
router.get("/:user_id/detail", requireAdminOpd(), getKehadiranByUserId);

module.exports = router;