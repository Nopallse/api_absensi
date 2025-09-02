const express = require("express");
const router = express.Router();
const { requireAuth, requireAdminOpd, requireSuperAdmin } = require("../middlewares/authMiddleware");
const {
  getMyLocation,
  createLokasi,
  getLokasi,
  getLokasiById,
  updateLokasi,
  deleteLokasi,
  searchLokasi
} = require("../controllers/lokasiController");

// Routes untuk user biasa
router.get("/my-location", requireAuth(), getMyLocation);
router.get("/search", requireAuth(), searchLokasi);
router.get("/:lokasi_id", requireAuth(), getLokasiById);

// Routes untuk admin (OPD dan Super Admin)
router.get("/", requireAdminOpd(), getLokasi);
router.post("/", requireAdminOpd(), createLokasi);
router.put("/:lokasi_id", requireAdminOpd(), updateLokasi);

// Routes khusus Super Admin
router.delete("/:lokasi_id", requireSuperAdmin(), deleteLokasi);

module.exports = router;
