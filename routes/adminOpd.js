const express = require("express");
const router = express.Router();
const { requireAdminOpd } = require("../middlewares/authMiddleware");
const { adminDeviceResetLogMiddleware } = require("../middlewares/adminLogMiddleware");

// Import controllers yang diperlukan
const { getUserById, getAllUser, searchUsersOpd } = require("../controllers/userController");
const { getAllKehadiran, getKehadiranByUserId } = require("../controllers/kehadiranController");
const { getAllResetRequests, updateResetRequestStatus } = require("../controllers/deviceResetController");
const { exportPresensiHarian, exportPresensiBulanan } = require("../controllers/exportController");

// User management (requires admin OPD level or higher)
router.get("/users", requireAdminOpd(), getAllUser);
router.get("/users/search", requireAdminOpd(), searchUsersOpd);
router.get("/users/:id", requireAdminOpd(), getUserById);

// Kehadiran management (requires admin OPD level or higher)
router.get("/kehadiran", requireAdminOpd(), getAllKehadiran);
router.get("/kehadiran/user/:user_id", requireAdminOpd(), getKehadiranByUserId);

// Device reset management (requires admin OPD level or higher)
router.get("/device-reset/requests", requireAdminOpd(), getAllResetRequests);
router.put("/device-reset/requests/:id", 
  requireAdminOpd(), 
  adminDeviceResetLogMiddleware('UPDATE'),
  updateResetRequestStatus
);

// Export presensi routes (requires admin OPD level or higher)
router.get("/kehadiran/export/harian", 
  requireAdminOpd(), 
  exportPresensiHarian
);
router.get("/kehadiran/export/bulanan", 
  requireAdminOpd(), 
  exportPresensiBulanan
);

module.exports = router; 