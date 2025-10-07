const express = require("express");
const router = express.Router();
const { requireSuperAdmin } = require("../middlewares/authMiddleware");
const { adminLogMiddleware, adminAuthLogMiddleware, adminDeviceResetLogMiddleware } = require("../middlewares/adminLogMiddleware");
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
const { getAllSatker, searchSatker, getSatkerById, getSatkerBySkpd } = require("../controllers/satkerController");
const { getAllBidang, searchBidang, getBidangById, getBidangBySatker } = require("../controllers/bidangController");
const { 
  getSatkerBySkpdHierarchy,

  getSatkerByIdInSkpd,
  getBidangBySatkerInSkpd,
  getBidangByIdInSatker
} = require("../controllers/hierarchyController");
const { getAllJadwalKegiatan, createJadwalKegiatan, getJadwalKegiatanById, updateJadwalKegiatan, deleteJadwalKegiatan, addLokasiToKegiatan, getLokasiKegiatan, removeLokasiFromKegiatan, editLokasiKegiatan, editSkpdKegiatanLokasi } = require("../controllers/jadwalKegiatanController");
const { addSkpdToKegiatanLokasi, removeSkpdFromKegiatanLokasi } = require("../controllers/jadwalKegiatanLokasiSkpdController");
const { getAllSettings, updateGlobalTipeJadwal, getCurrentTipeJadwal } = require("../controllers/systemSettingController");
const { getAllResetRequests, updateResetRequestStatus } = require("../controllers/deviceResetController");
const { getAllAdminLogs, getAdminLogById, getAdminLogsByAdminId, getAdminLogStats, deleteOldAdminLogs } = require("../controllers/adminLogController");
const { exportPresensiHarian, exportPresensiBulanan, debugExportHarian } = require("../controllers/exportController");

// Routes untuk Super Admin (level 1)
router.post("/register", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'CREATE', 
    resource: 'users',
    getDescription: (req) => `Register new user: ${req.body.username}`
  }),
  register
);


// User management
router.get("/users", requireSuperAdmin(), getAllUser);
router.get("/users/:id", requireSuperAdmin(), getUserById);
router.patch("/users/:id", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'UPDATE', 
    resource: 'users',
    getDescription: (req) => `Update user ID: ${req.params.id}`
  }),
  updateUserByAdmin
);
router.post("/users/:userId/force-logout", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'FORCE_LOGOUT', 
    resource: 'users',
    getDescription: (req) => `Force logout user ID: ${req.params.userId}`
  }),
  forceLogoutUser
);

// Dashboard routes
router.get("/dashboard/super-admin", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'READ', 
    resource: 'dashboard',
    getDescription: () => 'Access super admin dashboard with kehadiran filtering'
  }),
  getSuperAdminDashboard
);


// Lokasi management
  router.post("/lokasi", 
    requireSuperAdmin(), 
    adminLogMiddleware({ 
      action: 'CREATE', 
      resource: 'lokasi',
      getDescription: (req) => `Create new location: ${req.body.nama_lokasi}`
    }),
    createLokasi
  );
  router.get("/lokasi", requireSuperAdmin(), getAllLokasi);
  router.get("/lokasi/:lokasi_id", requireSuperAdmin(), getLokasiById);
  router.patch("/lokasi/:lokasi_id", 
    requireSuperAdmin(), 
    adminLogMiddleware({ 
      action: 'UPDATE', 
      resource: 'lokasi',
      getDescription: (req) => `Update location ID: ${req.params.lokasi_id}`
    }),
    updateLokasi
  );
  router.delete("/lokasi/:lokasi_id", 
    requireSuperAdmin(), 
    adminLogMiddleware({ 
      action: 'DELETE', 
      resource: 'lokasi',
      getDescription: (req) => `Delete location ID: ${req.params.lokasi_id}`
    }),
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
  adminLogMiddleware({ 
    action: 'EXPORT', 
    resource: 'PRESENSI_HARIAN',
    getDescription: (req) => `Export presensi harian untuk tanggal ${req.query.tanggal}`
  }),
  exportPresensiHarian
);
router.get("/kehadiran/export/bulanan", 
  requireSuperAdmin(),
  adminLogMiddleware({ 
    action: 'EXPORT', 
    resource: 'PRESENSI_BULANAN',
    getDescription: (req) => `Export presensi bulanan untuk ${req.query.month}/${req.query.year}`
  }),
  exportPresensiBulanan
);




// Organization Assignment Management (DinasSetjam CRUD)
router.get("/jam-dinas/organization", requireSuperAdmin(), getJamDinasForOrganization);
router.get("/jam-dinas/organization/:id", requireSuperAdmin(), getOrganizationAssignmentById);
router.post("/jam-dinas/organization", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'CREATE', 
    resource: 'jam_dinas_organization',
    getDescription: (req) => `Create organization assignment`
  }),
  createOrganizationAssignment
);
router.put("/jam-dinas/organization/:id", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'UPDATE', 
    resource: 'jam_dinas_organization',
    getDescription: (req) => `Update organization assignment ID: ${req.params.id}`
  }),
  updateOrganizationAssignment
);
router.delete("/jam-dinas/organization/:id", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'DELETE', 
    resource: 'jam_dinas_organization',
    getDescription: (req) => `Delete organization assignment ID: ${req.params.id}`
  }),
  deleteOrganizationAssignment
);
router.patch("/jam-dinas/organization/:id/toggle-status", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'UPDATE', 
    resource: 'jam_dinas_organization',
    getDescription: (req) => `Toggle status organization assignment ID: ${req.params.id}`
  }),
  toggleOrganizationAssignmentStatus
);



// Jam Dinas Management
router.get("/jam-dinas", requireSuperAdmin(), getAllJamDinas);
router.get("/jam-dinas/:id", requireSuperAdmin(), getJamDinasById);
router.post("/jam-dinas", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'CREATE', 
    resource: 'jam_dinas',
    getDescription: (req) => `Create jam dinas: ${req.body.nama_jam_dinas}`
  }),
  createJamDinas
);
router.put("/jam-dinas/:id", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'UPDATE', 
    resource: 'jam_dinas',
    getDescription: (req) => `Update jam dinas ID: ${req.params.id}`
  }),
  updateJamDinas
);
router.delete("/jam-dinas/:id", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'DELETE', 
    resource: 'jam_dinas',
    getDescription: (req) => `Delete jam dinas ID: ${req.params.id}`
  }),
  deleteJamDinas
);


router.post("/jam-dinas-detail", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'CREATE', 
    resource: 'jam_dinas_detail',
    getDescription: (req) => `Create jam dinas detail`
  }),
  createJamDinasDetail
);
router.put("/jam-dinas-details/:id", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'UPDATE', 
    resource: 'jam_dinas_detail',
    getDescription: (req) => `Update jam dinas detail ID: ${req.params.id}`
  }),
  updateJamDinasDetail
);
router.delete("/jam-dinas-details/:id", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'DELETE', 
    resource: 'jam_dinas_detail',
    getDescription: (req) => `Delete jam dinas detail ID: ${req.params.id}`
  }),
  deleteJamDinasDetail
);



// Level 2: SKPD -> Satker (Second Level)
router.get("/skpd/:kdskpd/satker", requireSuperAdmin(), getSatkerBySkpdHierarchy);
router.get("/skpd/:kdskpd/satker/:kdsatker", requireSuperAdmin(), getSatkerByIdInSkpd);

// Level 3: SKPD -> Satker -> Bidang (Third Level)
router.get("/skpd/:kdskpd/satker/:kdsatker/bidang", requireSuperAdmin(), getBidangBySatkerInSkpd);
router.get("/skpd/:kdskpd/satker/:kdsatker/bidang/:bidangf", requireSuperAdmin(), getBidangByIdInSatker);

// Alternative flat structure for backward compatibility
router.get("/satker", requireSuperAdmin(), getAllSatker);
router.get("/satker/:kdsatker", requireSuperAdmin(), getSatkerById);
router.get("/bidang", requireSuperAdmin(), getAllBidang);
router.get("/bidang/:bidangf", requireSuperAdmin(), getBidangById);



// Jadwal Kegiatan management
router.get('/kegiatan', requireSuperAdmin(), getAllJadwalKegiatan);
router.post('/kegiatan', 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'CREATE', 
    resource: 'jadwal_kegiatan',
    getDescription: (req) => `Create jadwal kegiatan: ${req.body.nama_kegiatan}`
  }),
  createJadwalKegiatan
);
router.get('/kegiatan/:id_kegiatan', requireSuperAdmin(), getJadwalKegiatanById);
router.put('/kegiatan/:id_kegiatan', 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'UPDATE', 
    resource: 'jadwal_kegiatan',
    getDescription: (req) => `Update jadwal kegiatan ID: ${req.params.id_kegiatan}`
  }),
  updateJadwalKegiatan
);
router.delete('/kegiatan/:id_kegiatan', 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'DELETE', 
    resource: 'jadwal_kegiatan',
    getDescription: (req) => `Delete jadwal kegiatan ID: ${req.params.id_kegiatan}`
  }),
  deleteJadwalKegiatan
);

// Route untuk menambah lokasi ke kegiatan
router.post('/jadwal-kegiatan/:id_kegiatan/lokasi', 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'CREATE', 
    resource: 'jadwal_kegiatan_lokasi',
    getDescription: (req) => `Add location to kegiatan ID: ${req.params.id_kegiatan}`
  }),
  addLokasiToKegiatan
);
router.post('/jadwal-kegiatan-lokasi-skpd/add', 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'CREATE', 
    resource: 'jadwal_kegiatan_lokasi_skpd',
    getDescription: (req) => `Add SKPD to kegiatan lokasi`
  }),
  addSkpdToKegiatanLokasi
);
router.delete('/jadwal-kegiatan-lokasi-skpd/remove/:id_kegiatan/:lokasi_id/:kdskpd', 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'DELETE', 
    resource: 'jadwal_kegiatan_lokasi_skpd',
    getDescription: (req) => `Remove SKPD from kegiatan lokasi`
  }),
  removeSkpdFromKegiatanLokasi
);
router.get('/jadwal-kegiatan-lokasi-skpd/:id_kegiatan/lokasi', requireSuperAdmin(), getLokasiKegiatan);
router.delete('/jadwal-kegiatan/:id_kegiatan/lokasi/:lokasi_id', 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'DELETE', 
    resource: 'jadwal_kegiatan_lokasi',
    getDescription: (req) => `Remove location from kegiatan ID: ${req.params.id_kegiatan}`
  }),
  removeLokasiFromKegiatan
);

// Edit routes untuk jadwal kegiatan
router.put('/jadwal-kegiatan/:id_kegiatan/lokasi/:lokasi_id/edit', 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'UPDATE', 
    resource: 'jadwal_kegiatan_lokasi',
    getDescription: (req) => `Edit location for kegiatan ID: ${req.params.id_kegiatan}`
  }),
  editLokasiKegiatan
);

router.put('/jadwal-kegiatan/:id_kegiatan/lokasi/:lokasi_id/skpd', 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'UPDATE', 
    resource: 'jadwal_kegiatan_lokasi_skpd',
    getDescription: (req) => `Edit SKPD list for kegiatan-lokasi ID: ${req.params.id_kegiatan}-${req.params.lokasi_id}`
  }),
  editSkpdKegiatanLokasi
);

// System Settings Management
router.get("/system-settings", requireSuperAdmin(), getAllSettings);
router.get("/system-settings/tipe-jadwal", requireSuperAdmin(), getCurrentTipeJadwal);
router.put("/system-settings/tipe-jadwal", 
  requireSuperAdmin(), 
  adminLogMiddleware({ 
    action: 'UPDATE', 
    resource: 'system_settings',
    getDescription: (req) => `Update global tipe jadwal`
  }),
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
  adminLogMiddleware({ 
    action: 'DELETE', 
    resource: 'admin_logs',
    getDescription: (req) => `Cleanup admin logs older than ${req.body.days || 90} days`
  }),
  deleteOldAdminLogs
);

module.exports = router;