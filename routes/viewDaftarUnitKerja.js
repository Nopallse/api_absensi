const express = require('express');
const router = express.Router();
const {
  getAllViewDaftarUnitKerja,
  getLevel1DataNoView,
  getLevel2DataNoView,
  getLevel3DataNoView,
  getViewDaftarUnitKerjaById,
  getViewDaftarUnitKerjaStats,
  getFilterOptions,
  getFilterOptionsHierarchy
} = require('../controllers/viewDaftarUnitKerjaController');

// GET /api/view-daftar-unit-kerja - Mendapatkan semua data dengan pagination, search, dan filter
router.get('/', getAllViewDaftarUnitKerja);

// GET /api/view-daftar-unit-kerja/all - Mendapatkan semua data tanpa pagination untuk filtering di frontend

// GET /api/view-daftar-unit-kerja/level1 - Mendapatkan data Level 1 (Satuan Kerja)
router.get('/level1', getLevel1DataNoView);

// GET /api/view-daftar-unit-kerja/level2 - Mendapatkan data Level 2 (Bidang)
router.get('/level2', getLevel2DataNoView);

// GET /api/view-daftar-unit-kerja/level3 - Mendapatkan data Level 3 (Sub Bidang)
router.get('/level3', getLevel3DataNoView);

// GET /api/view-daftar-unit-kerja/stats - Mendapatkan statistik data berdasarkan jenis
router.get('/stats', getViewDaftarUnitKerjaStats);

// GET /api/view-daftar-unit-kerja/filter-options - Mendapatkan filter options untuk dropdown
router.get('/filter-options', getFilterOptions);

// GET /api/view-daftar-unit-kerja/filter-options-hierarchy - Mendapatkan data untuk dropdown filter dengan hirarki
router.get('/filter-options-hierarchy', getFilterOptionsHierarchy);
router.get('/filter-options-hierarchy/:kd_kerja_level1', getFilterOptionsHierarchy);
router.get('/filter-options-hierarchy/:kd_kerja_level1/:kd_kerja_level2', getFilterOptionsHierarchy);

// GET /api/view-daftar-unit-kerja/:kd_unit_kerja - Mendapatkan data berdasarkan kd_unit_kerja
// HARUS di akhir karena akan menangkap semua route yang tidak cocok
router.get('/:kd_unit_kerja', getViewDaftarUnitKerjaById);

module.exports = router;
