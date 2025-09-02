const express = require("express");
const router = express.Router();
const { requireAdminOpd } = require("../middlewares/authMiddleware");

// Import controllers yang diperlukan
const { getUserById, getAllUser } = require("../controllers/userController");
const { getAllKehadiran, getKehadiranByUserId } = require("../controllers/kehadiranController");
const { getAllKetidakhadiran } = require("../controllers/ketidakhadiranController");

// User management (requires admin OPD level or higher)
router.get("/users", requireAdminOpd(), getAllUser);
router.get("/users/:id", requireAdminOpd(), getUserById);

// Kehadiran management (requires admin OPD level or higher)
router.get("/kehadiran", requireAdminOpd(), getAllKehadiran);
router.get("/kehadiran/user/:user_id", requireAdminOpd(), getKehadiranByUserId);

// Ketidakhadiran management (requires admin OPD level or higher)
router.get("/ketidakhadiran", requireAdminOpd(), getAllKetidakhadiran);

module.exports = router; 