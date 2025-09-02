const express = require("express");
const router = express.Router();
const { requireAuth, requireAdminOpd } = require("../middlewares/authMiddleware");
const {
  createKetidakhadiran,
  getKetidakhadiran,
  getAllKetidakhadiran,
  getDetailKetidakhadiran,
  updateKetidakhadiranStatus
} = require("../controllers/ketidakhadiranController");

// User routes (requires authentication)
router.post("/", requireAuth(), createKetidakhadiran);
router.get("/", requireAuth(), getKetidakhadiran);
router.get("/:id", requireAuth(), getDetailKetidakhadiran);

// Admin routes (requires admin OPD level or higher)
router.get("/admin/all", requireAdminOpd(), getAllKetidakhadiran);
router.patch("/admin/:id/status", requireAdminOpd(), updateKetidakhadiranStatus);

module.exports = router; 