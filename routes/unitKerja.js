const express = require('express');
const router = express.Router();
const {
  getAllSatker,
  getSatkerDetail,
  getBidangDetail,
  getSubBidangDetail,
  setLocation,
  getLocationHierarchyController,
  getSatkerLocations
} = require('../controllers/unitKerjaController');

// GET /api/unit-kerja - Mendapatkan semua satker
router.get('/', getAllSatker);

// GET /api/unit-kerja/:id-satker - Mendapatkan detail satker beserta bidang-bidangnya
router.get('/:idSatker', getSatkerDetail);

// GET /api/unit-kerja/:id-satker/:id-bidang - Mendapatkan detail bidang beserta sub-bidangnya
router.get('/:idSatker/:idBidang', getBidangDetail);

// GET /api/unit-kerja/:id-satker/:id-bidang/:id-sub-bidang - Mendapatkan detail sub-bidang
router.get('/:idSatker/:idBidang/:idSubBidang', getSubBidangDetail);

// POST /api/unit-kerja/:id-satker/location - Mengatur lokasi satker
router.post('/:idSatker/location', setLocation);

// POST /api/unit-kerja/:id-satker/:id-bidang/location - Mengatur lokasi bidang
router.post('/:idSatker/:idBidang/location', setLocation);

// POST /api/unit-kerja/:id-satker/:id-bidang/:id-sub-bidang/location - Mengatur lokasi sub-bidang
router.post('/:idSatker/:idBidang/:idSubBidang/location', setLocation);

// GET /api/unit-kerja/:id-satker/locations - Mendapatkan semua lokasi untuk satker
router.get('/:idSatker/locations', getSatkerLocations);

// GET /api/unit-kerja/:id-satker/location-hierarchy - Mendapatkan hierarki lokasi
router.get('/:idSatker/location-hierarchy', getLocationHierarchyController);

module.exports = router;
