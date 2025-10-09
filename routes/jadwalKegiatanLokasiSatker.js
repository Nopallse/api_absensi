const express = require('express');
const router = express.Router();
const { requireAuth, requireAdminOpd } = require("../middlewares/authMiddleware");
const {
    addSkpdToKegiatanLokasi,
    removeSkpdFromKegiatanLokasi,
    getSkpdByKegiatanLokasi,
    getLokasiKegiatanBySkpd,
    getAllJadwalKegiatanLokasiSkpd,
    getLokasiKegiatanForUser
} = require('../controllers/jadwalKegiatanLokasiSkpdController');

// Routes untuk management relasi jadwal kegiatan lokasi SKPD (requires admin OPD level or higher)
router.get('/kegiatan/:id_kegiatan/lokasi/:lokasi_id', requireAdminOpd(), getSkpdByKegiatanLokasi);
router.get('/skpd/:kdskpd', requireAdminOpd(), getLokasiKegiatanBySkpd);
router.get('/all', requireAdminOpd(), getAllJadwalKegiatanLokasiSkpd);

// Route khusus untuk user (public access for mobile app)
router.get('/user-location', getLokasiKegiatanForUser);

module.exports = router; 