const express = require('express');
const router = express.Router();
const {
  getAllLokasi,
  getLokasiById,
  getEffectiveLocationController,
  getLocationHierarchyController,
  createLokasi,
  updateLokasi,
  deleteLokasi,
  getLokasiByLevel
} = require('../controllers/lokasiController');




// GET /api/lokasi - Mendapatkan semua lokasi dengan pagination
router.get('/', getAllLokasi);

// GET /api/lokasi/level/:level - Mendapatkan lokasi berdasarkan level
router.get('/level/:level', getLokasiByLevel);

// GET /api/lokasi/effective/:kd_unit_kerja - Mendapatkan lokasi efektif untuk unit kerja
router.get('/effective/:kd_unit_kerja', getEffectiveLocationController);

// GET /api/lokasi/hierarchy/:kd_unit_kerja - Mendapatkan hierarki lokasi untuk unit kerja
router.get('/hierarchy/:kd_unit_kerja', getLocationHierarchyController);

// GET /api/lokasi/:id - Mendapatkan lokasi berdasarkan ID
router.get('/:id', getLokasiById);

// POST /api/lokasi - Membuat lokasi baru
router.post('/', createLokasi);

// PUT /api/lokasi/:id - Mengupdate lokasi
router.put('/:id', updateLokasi);

// DELETE /api/lokasi/:id - Menghapus lokasi
router.delete('/:id', deleteLokasi);

module.exports = router;