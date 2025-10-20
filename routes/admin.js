const express = require("express");
const router = express.Router();
const { requireSuperAdmin } = require("../middlewares/authMiddleware");
const { adminDeviceResetLogMiddleware } = require("../middlewares/adminLogMiddleware");
const {
  createLokasi,
  getAllLokasi,
  getLokasiById,
  updateLokasi,
  deleteLokasi,
} = require("../controllers/lokasiController");
const { register, forceLogoutUser } = require("../controllers/authController");
const { getUserById, getAllUser, updateUserByAdmin } = require("../controllers/userController");
const { getAllKehadiran, getKehadiranByUserId, getKehadiranById, getMonthlyAttendanceByFilter, getMonthlyAttendanceSummaryByUser } = require("../controllers/kehadiranController");
const { 
    getSuperAdminDashboard
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
const { 
  getSatkerBySkpdHierarchy,

  getSatkerByIdInSkpd,
  getBidangBySatkerInSkpd,
  getBidangByIdInSatker
} = require("../controllers/hierarchyController");
const { getAllJadwalKegiatan, createJadwalKegiatan, getJadwalKegiatanById, updateJadwalKegiatan, deleteJadwalKegiatan, addLokasiToKegiatan, getLokasiKegiatan, removeLokasiFromKegiatan, editLokasiKegiatan, editSkpdKegiatanLokasi,getAllSatkerKegiatan,getDetailSatkerKegiatan,downloadBulkExcelKegiatan,downloadSatkerExcelKegiatan } = require("../controllers/jadwalKegiatanController");
const { addSkpdToKegiatanLokasi, removeSkpdFromKegiatanLokasi } = require("../controllers/jadwalKegiatanLokasiSkpdController");
const { getAllSettings, updateGlobalTipeJadwal, getCurrentTipeJadwal } = require("../controllers/systemSettingController");
const { getAllResetRequests, updateResetRequestStatus } = require("../controllers/deviceResetController");
const { getAllAdminLogs, getAdminLogById, getAdminLogsByAdminId, getAdminLogStats, deleteOldAdminLogs } = require("../controllers/adminLogController");
const { exportPresensiHarian, exportPresensiBulanan, debugExportHarian } = require("../controllers/exportController");
const {
  getAllSatker,
  getSatkerDetail,
  getBidangDetail,
  getSubBidangDetail,
  setLocation,
  getLocationHierarchyController,
  getSatkerLocations
} = require('../controllers/unitKerjaController');


// User management
router.get("/users", requireSuperAdmin(), getAllUser);
router.get("/users/:id", requireSuperAdmin(), getUserById);
router.patch("/users/:id", 
  requireSuperAdmin(), 
  updateUserByAdmin
);


// Dashboard routes
router.get("/dashboard/super-admin", 
  requireSuperAdmin(), 
  getSuperAdminDashboard
);


// Lokasi management
  router.post("/lokasi", 
    requireSuperAdmin(), 
    createLokasi
  );
  router.get("/lokasi", requireSuperAdmin(), getAllLokasi);
  router.get("/lokasi/:lokasi_id", requireSuperAdmin(), getLokasiById);
  router.patch("/lokasi/:lokasi_id", 
    requireSuperAdmin(), 
    updateLokasi
  );
  router.delete("/lokasi/:lokasi_id", 
    requireSuperAdmin(), 
    deleteLokasi
  );

// Kehadiran management
router.get("/kehadiran", requireSuperAdmin(), getAllKehadiran);
router.get("/kehadiran/:id", requireSuperAdmin(), getKehadiranById);
router.get("/kehadiran/user/:user_id", requireSuperAdmin(), getKehadiranByUserId);

// Monthly attendance routes
router.get("/kehadiran/monthly/filter", requireSuperAdmin(), getMonthlyAttendanceByFilter);
router.get("/kehadiran/monthly/summary", requireSuperAdmin(), getMonthlyAttendanceSummaryByUser);

// Export presensi routes
router.get("/kehadiran/export/harian", 
  requireSuperAdmin(), 
  exportPresensiHarian
);
router.get("/kehadiran/export/bulanan", 
  requireSuperAdmin(),
  exportPresensiBulanan
);




// Organization Assignment Management (DinasSetjam CRUD)
router.get("/jam-dinas/organization", requireSuperAdmin(), getJamDinasForOrganization);
router.get("/jam-dinas/organization/:id", requireSuperAdmin(), getOrganizationAssignmentById);
router.post("/jam-dinas/organization", 
  requireSuperAdmin(), 
  createOrganizationAssignment
);
router.put("/jam-dinas/organization/:id", 
  requireSuperAdmin(), 
  updateOrganizationAssignment
);
router.delete("/jam-dinas/organization/:id", 
  requireSuperAdmin(), 
  deleteOrganizationAssignment
);
router.patch("/jam-dinas/organization/:id/toggle-status", 
  requireSuperAdmin(), 
  toggleOrganizationAssignmentStatus
);



// Jam Dinas Management
router.get("/jam-dinas", requireSuperAdmin(), getAllJamDinas);
router.get("/jam-dinas/:id", requireSuperAdmin(), getJamDinasById);
router.post("/jam-dinas", 
  requireSuperAdmin(), 
  createJamDinas
);
router.put("/jam-dinas/:id", 
  requireSuperAdmin(), 
  updateJamDinas
);
router.delete("/jam-dinas/:id", 
  requireSuperAdmin(), 
  deleteJamDinas
);


router.post("/jam-dinas-detail", 
  requireSuperAdmin(), 
  createJamDinasDetail
);
router.put("/jam-dinas-details/:id", 
  requireSuperAdmin(), 
  updateJamDinasDetail
);
router.delete("/jam-dinas-details/:id", 
  requireSuperAdmin(), 
  deleteJamDinasDetail
);




// Jadwal Kegiatan management
router.get('/kegiatan', requireSuperAdmin(), getAllJadwalKegiatan);
router.post('/kegiatan', 
  requireSuperAdmin(), 
  createJadwalKegiatan
);
router.get('/kegiatan/:id_kegiatan', requireSuperAdmin(), getJadwalKegiatanById);
router.put('/kegiatan/:id_kegiatan', 
  requireSuperAdmin(), 
  updateJadwalKegiatan
);
router.delete('/kegiatan/:id_kegiatan', 
  requireSuperAdmin(), 
  deleteJadwalKegiatan
);

// Route untuk menambah lokasi ke kegiatan
router.post('/jadwal-kegiatan/:id_kegiatan/lokasi', 
  requireSuperAdmin(), 
  addLokasiToKegiatan
);
router.post('/jadwal-kegiatan-lokasi-satker/add', 
  requireSuperAdmin(), 
  addSkpdToKegiatanLokasi
);
router.delete('/jadwal-kegiatan-lokasi-satker/remove/:id_kegiatan/:lokasi_id/:kdskpd', 
  requireSuperAdmin(), 
  removeSkpdFromKegiatanLokasi
);
router.get('/jadwal-kegiatan-lokasi-satker/:id_kegiatan/lokasi', requireSuperAdmin(), getLokasiKegiatan);
router.delete('/jadwal-kegiatan/:id_kegiatan/lokasi/:lokasi_id', 
  requireSuperAdmin(), 
  removeLokasiFromKegiatan
);

// Edit routes untuk jadwal kegiatan
router.put('/jadwal-kegiatan/:id_kegiatan/lokasi/:lokasi_id/edit', 
  requireSuperAdmin(), 
  editLokasiKegiatan
);

router.put('/jadwal-kegiatan/:id_kegiatan/lokasi/:lokasi_id/satker', 
  requireSuperAdmin(), 
  editSkpdKegiatanLokasi
);

router.get('/jadwal-kegiatan/:id_kegiatan/satker',
  requireSuperAdmin(),
  getAllSatkerKegiatan
)

router.get('/jadwal-kegiatan/:id_kegiatan/satker/:id_satker',
  requireSuperAdmin(),
  getDetailSatkerKegiatan
)

// Download Excel routes
router.get('/jadwal-kegiatan/:id_kegiatan/download-excel',
  requireSuperAdmin(),
  downloadBulkExcelKegiatan
)

router.get('/jadwal-kegiatan/:id_kegiatan/satker/:id_satker/download-excel',
  requireSuperAdmin(),
  downloadSatkerExcelKegiatan
)


// System Settings Management
router.get("/system-settings", requireSuperAdmin(), getAllSettings);
router.get("/system-settings/tipe-jadwal", requireSuperAdmin(), getCurrentTipeJadwal);
router.put("/system-settings/tipe-jadwal", 
  requireSuperAdmin(), 
  updateGlobalTipeJadwal
);

// Device Reset Management
router.get("/device-reset-requests", requireSuperAdmin(), getAllResetRequests);
router.put("/device-reset-requests/:id", 
  requireSuperAdmin(), 
  adminDeviceResetLogMiddleware('UPDATE'),
  updateResetRequestStatus
);

// Admin Logs Management
router.get("/admin-logs", requireSuperAdmin(), getAllAdminLogs);
router.get("/admin-logs/:id", requireSuperAdmin(), getAdminLogById);
router.get("/admin-logs/admin/:adminId", requireSuperAdmin(), getAdminLogsByAdminId);
router.get("/admin-logs/stats", requireSuperAdmin(), getAdminLogStats);
router.delete("/admin-logs/cleanup", 
  requireSuperAdmin(), 
  deleteOldAdminLogs
);


router.get('/unit-kerja/', getAllSatker);

// GET /api/unit-kerja/:id-satker - Mendapatkan detail satker beserta bidang-bidangnya
router.get('/unit-kerja/:idSatker', getSatkerDetail);

// GET /api/unit-kerja/:id-satker/:id-bidang - Mendapatkan detail bidang beserta sub-bidangnya
router.get('/unit-kerja/:idSatker/:idBidang', getBidangDetail);

// GET /api/unit-kerja/:id-satker/:id-bidang/:id-sub-bidang - Mendapatkan detail sub-bidang
router.get('/unit-kerja/:idSatker/:idBidang/:idSubBidang', getSubBidangDetail);

// POST /api/unit-kerja/:id-satker/location - Mengatur lokasi satker
router.post('/unit-kerja/:idSatker/location', setLocation);

// POST /api/unit-kerja/:id-satker/:id-bidang/location - Mengatur lokasi bidang
router.post('/unit-kerja/:idSatker/:idBidang/location', setLocation);

// POST /api/unit-kerja/:id-satker/:id-bidang/:id-sub-bidang/location - Mengatur lokasi sub-bidang
router.post('/unit-kerja/:idSatker/:idBidang/:idSubBidang/location', setLocation);

// GET /api/unit-kerja/:id-satker/locations - Mendapatkan semua lokasi untuk satker
router.get('/unit-kerja/:idSatker/locations', getSatkerLocations);

// GET /api/unit-kerja/:id-satker/location-hierarchy - Mendapatkan hierarki lokasi
router.get('/unit-kerja/:idSatker/location-hierarchy', getLocationHierarchyController);

module.exports = router;