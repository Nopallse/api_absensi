const express = require("express");
const router = express.Router();
const { requireSuperAdmin } = require("../middlewares/authMiddleware");
const {
  createLokasi,
  getLokasi,
  getLokasiById,
  updateLokasi,
  deleteLokasi,
  searchLokasi,
} = require("../controllers/lokasiController");
const { register } = require("../controllers/authController");
const { getUserById, getAllUser, searchUsers, updateUserByAdmin } = require("../controllers/userController");
const {  getDetailKetidakhadiran, updateKetidakhadiranStatus, getAllKetidakhadiran } = require("../controllers/ketidakhadiranController");
const { getAllKehadiran, getKehadiranByUserId, getKehadiranById, getMonthlyAttendanceByFilter, getMonthlyAttendanceSummaryByUser } = require("../controllers/kehadiranController");
const { 
    getDashboardOverview, 
    getWeeklyAttendanceStats, 
    getTopAttendanceUsers, 
    getLocationAttendanceStats, 
    getTodayRealTimeStats 
} = require("../controllers/dashboardController");
const { 
    getAllJamDinas,
    getJamDinasById,
    createJamDinas,
    updateJamDinas,
    deleteJamDinas,
    createJamDinasDetail,
    getAllJamDinasDetails,
    getJamDinasDetailById,
    updateJamDinasDetail,
    deleteJamDinasDetail,
    getJamDinasForOrganization,
    getAllOrganizationAssignments,
    getOrganizationAssignmentById,
    createOrganizationAssignment,
    updateOrganizationAssignment,
    deleteOrganizationAssignment,
    toggleOrganizationAssignmentStatus
} = require("../controllers/jamDinasController");
const { getAllSkpd, searchSkpd, getSkpdById, getSkpdByStatus } = require("../controllers/skpdController");
const { getAllSatker, searchSatker, getSatkerById, getSatkerBySkpd } = require("../controllers/satkerController");
const { getAllBidang, searchBidang, getBidangById, getBidangBySatker } = require("../controllers/bidangController");
const { 
  getSatkerBySkpdHierarchy,
  searchSatkerInSkpd,
  getSatkerByIdInSkpd,
  getBidangBySatkerInSkpd,
  searchBidangInSatker,
  getBidangByIdInSatker
} = require("../controllers/hierarchyController");
const { getAllJadwalKegiatan, createJadwalKegiatan, getJadwalKegiatanById, updateJadwalKegiatan, deleteJadwalKegiatan, addLokasiToKegiatan, getLokasiKegiatan, removeLokasiFromKegiatan    } = require("../controllers/jadwalKegiatanController");
const { addSkpdToKegiatanLokasi, removeSkpdFromKegiatanLokasi } = require("../controllers/jadwalKegiatanLokasiSkpdController");
const { getAllSettings, updateGlobalTipeJadwal, getCurrentTipeJadwal } = require("../controllers/systemSettingController");

// Routes untuk Super Admin (level 1)
router.post("/register", requireSuperAdmin(), register);

// Routes untuk Admin OPD dan ke atas (level 1, 2, 3)
// Dashboard routes
router.get("/dashboard/overview", requireSuperAdmin(), getDashboardOverview);
router.get("/dashboard/weekly-stats", requireSuperAdmin(), getWeeklyAttendanceStats);
router.get("/dashboard/top-users", requireSuperAdmin(), getTopAttendanceUsers);
router.get("/dashboard/location-stats", requireSuperAdmin(), getLocationAttendanceStats);
router.get("/dashboard/realtime", requireSuperAdmin(), getTodayRealTimeStats);

// User management
router.get("/users", requireSuperAdmin(), getAllUser)
router.get("/users/search", requireSuperAdmin(), searchUsers);
router.get("/users/:id", requireSuperAdmin(), getUserById);
router.patch("/users/:id", requireSuperAdmin(), updateUserByAdmin);



// Lokasi management
router.post("/lokasi", requireSuperAdmin(), createLokasi);
router.get("/lokasi", requireSuperAdmin(), getLokasi);
router.get("/lokasi/search", requireSuperAdmin(), searchLokasi);
router.get("/lokasi/:lokasi_id", requireSuperAdmin(), getLokasiById);
router.patch("/lokasi/:lokasi_id", requireSuperAdmin(), updateLokasi);
router.delete("/lokasi/:lokasi_id", requireSuperAdmin(), deleteLokasi);

// Kehadiran management
router.get("/kehadiran", requireSuperAdmin(), getAllKehadiran);
router.get("/kehadiran/:id", requireSuperAdmin(), getKehadiranById);
router.get("/kehadiran/user/:user_id", requireSuperAdmin(), getKehadiranByUserId);

// Monthly attendance routes
router.get("/kehadiran/monthly/filter", requireSuperAdmin(), getMonthlyAttendanceByFilter);
router.get("/kehadiran/monthly/summary", requireSuperAdmin(), getMonthlyAttendanceSummaryByUser);

// Ketidakhadiran management
router.get("/ketidakhadiran", requireSuperAdmin(), getAllKetidakhadiran);
router.get("/ketidakhadiran/:id", requireSuperAdmin(), getDetailKetidakhadiran);
router.put("/ketidakhadiran/:id", requireSuperAdmin(), updateKetidakhadiranStatus);


// Organization Assignment Management (DinasSetjam CRUD)
router.get("/jam-dinas/organization", requireSuperAdmin(), getJamDinasForOrganization);
router.get("/jam-dinas/organization/:id", requireSuperAdmin(), getOrganizationAssignmentById);
router.post("/jam-dinas/organization", requireSuperAdmin(), createOrganizationAssignment);
router.put("/jam-dinas/organization/:id", requireSuperAdmin(), updateOrganizationAssignment);
router.delete("/jam-dinas/organization/:id", requireSuperAdmin(), deleteOrganizationAssignment);
router.patch("/jam-dinas/organization/:id/toggle-status", requireSuperAdmin(), toggleOrganizationAssignmentStatus);



// Jam Dinas Management
router.get("/jam-dinas", requireSuperAdmin(), getAllJamDinas);
router.get("/jam-dinas/:id", requireSuperAdmin(), getJamDinasById);
router.post("/jam-dinas", requireSuperAdmin(), createJamDinas);
router.put("/jam-dinas/:id", requireSuperAdmin(), updateJamDinas);
router.delete("/jam-dinas/:id", requireSuperAdmin(), deleteJamDinas);


router.post("/jam-dinas-detail", requireSuperAdmin(), createJamDinasDetail);
router.put("/jam-dinas-details/:id", requireSuperAdmin(), updateJamDinasDetail);
router.delete("/jam-dinas-details/:id", requireSuperAdmin(), deleteJamDinasDetail);


router.get("/skpd", requireSuperAdmin(), getAllSkpd);
router.get("/skpd/search", requireSuperAdmin(), searchSkpd);
router.get("/skpd/status", requireSuperAdmin(), getSkpdByStatus);
router.get("/skpd/:kdskpd", requireSuperAdmin(), getSkpdById);

// Level 2: SKPD -> Satker (Second Level)
router.get("/skpd/:kdskpd/satker", requireSuperAdmin(), getSatkerBySkpdHierarchy);
router.get("/skpd/:kdskpd/satker/search", requireSuperAdmin(), searchSatkerInSkpd);
router.get("/skpd/:kdskpd/satker/:kdsatker", requireSuperAdmin(), getSatkerByIdInSkpd);

// Level 3: SKPD -> Satker -> Bidang (Third Level)
router.get("/skpd/:kdskpd/satker/:kdsatker/bidang", requireSuperAdmin(), getBidangBySatkerInSkpd);
router.get("/skpd/:kdskpd/satker/:kdsatker/bidang/search", requireSuperAdmin(), searchBidangInSatker);
router.get("/skpd/:kdskpd/satker/:kdsatker/bidang/:bidangf", requireSuperAdmin(), getBidangByIdInSatker);

// Alternative flat structure for backward compatibility
router.get("/satker", requireSuperAdmin(), getAllSatker);
router.get("/satker/search", requireSuperAdmin(), searchSatker);
router.get("/satker/:kdsatker", requireSuperAdmin(), getSatkerById);
router.get("/bidang", requireSuperAdmin(), getAllBidang);
router.get("/bidang/search", requireSuperAdmin(), searchBidang);
router.get("/bidang/:bidangf", requireSuperAdmin(), getBidangById);



// Jadwal Kegiatan management
router.get('/kegiatan', requireSuperAdmin(), getAllJadwalKegiatan);
router.post('/kegiatan', requireSuperAdmin(), createJadwalKegiatan);
router.get('/kegiatan/:id_kegiatan', requireSuperAdmin(), getJadwalKegiatanById);
router.put('/kegiatan/:id_kegiatan', requireSuperAdmin(), updateJadwalKegiatan);
router.delete('/kegiatan/:id_kegiatan', requireSuperAdmin(), deleteJadwalKegiatan);

// Route untuk menambah lokasi ke kegiatan
router.post('/jadwal-kegiatan/:id_kegiatan/lokasi', requireSuperAdmin(), addLokasiToKegiatan);
router.post('/jadwal-kegiatan-lokasi-skpd/add', requireSuperAdmin(), addSkpdToKegiatanLokasi);
router.delete('/jadwal-kegiatan-lokasi-skpd/remove/:id_kegiatan/:lokasi_id/:kdskpd', requireSuperAdmin(), removeSkpdFromKegiatanLokasi);
router.get('/jadwal-kegiatan-lokasi-skpd/:id_kegiatan/lokasi', requireSuperAdmin(), getLokasiKegiatan);
router.delete('/jadwal-kegiatan/:id_kegiatan/lokasi/:lokasi_id', requireSuperAdmin(), removeLokasiFromKegiatan);

// System Settings Management
router.get("/system-settings", requireSuperAdmin(), getAllSettings);
router.get("/system-settings/tipe-jadwal", requireSuperAdmin(), getCurrentTipeJadwal);
router.put("/system-settings/tipe-jadwal", requireSuperAdmin(), updateGlobalTipeJadwal);

module.exports = router;