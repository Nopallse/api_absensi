const express = require('express');
const router = express.Router();
const { requireAuth, requireAdminOpd } = require("../middlewares/authMiddleware");
const {
    getJadwalHariIni,
    getAllJadwalKegiatan,
    createJadwalKegiatan,
    updateJadwalKegiatan,
    deleteJadwalKegiatan,
    getJadwalKegiatanById,
    getJadwalKegiatanByRange,
    getLokasiKegiatan,
    addLokasiToKegiatan,
    removeLokasiFromKegiatan
} = require('../controllers/jadwalKegiatanController');

// Route untuk mendapatkan jadwal hari ini (public access for mobile app)
router.get('/today', getJadwalHariIni);

// Routes that require authentication (for users)
router.get('/range', requireAuth(), getJadwalKegiatanByRange);

// Routes that require admin OPD level or higher
router.get('/', requireAdminOpd(), getAllJadwalKegiatan);
router.post('/', requireAdminOpd(), createJadwalKegiatan);
router.get('/:id', requireAdminOpd(), getJadwalKegiatanById);
router.put('/:id', requireAdminOpd(), updateJadwalKegiatan);
router.delete('/:id', requireAdminOpd(), deleteJadwalKegiatan);
router.get('/:id/lokasi', requireAdminOpd(), getLokasiKegiatan);
router.post('/:id/lokasi', requireAdminOpd(), addLokasiToKegiatan);
router.delete('/:id/lokasi/:lokasi_id', requireAdminOpd(), removeLokasiFromKegiatan);

module.exports = router; 