const express = require('express');
const router = express.Router();
const {
  getAllSatker,
  getSatkerDetail,
  getBidangDetail,
  getSubBidangDetail,
  setLocation,
  getLocationHierarchyController,
  getSatkerLocations,
  activateLocation,
  assignJamDinas,
  removeJamDinasAssignment,
  getSatkerOptions,
  getBidangOptions
} = require('../controllers/unitKerjaController');

// GET /api/unit-kerja - Mendapatkan semua satker
router.get('/', getAllSatker);
router.get('/options', getSatkerOptions);
router.get('/options/bidang', getBidangOptions);



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

// PUT /api/unit-kerja/:id-satker/activate-location - Mengaktifkan lokasi satker
router.put('/:idSatker/activate-location', activateLocation);

// PUT /api/unit-kerja/:id-satker/:id-bidang/activate-location - Mengaktifkan lokasi bidang
router.put('/:idSatker/:idBidang/activate-location', activateLocation);

// PUT /api/unit-kerja/:id-satker/:id-bidang/:id-sub-bidang/activate-location - Mengaktifkan lokasi sub-bidang
router.put('/:idSatker/:idBidang/:idSubBidang/activate-location', activateLocation);

// POST /api/unit-kerja/:id-satker/jam-dinas - Assign jam dinas untuk satker
router.post('/:idSatker/jam-dinas', assignJamDinas);

// POST /api/unit-kerja/:id-satker/:id-bidang/jam-dinas - Assign jam dinas untuk bidang
router.post('/:idSatker/:idBidang/jam-dinas', assignJamDinas);

// DELETE /api/unit-kerja/jam-dinas/:assignmentId - Hapus jam dinas assignment
router.delete('/jam-dinas/:assignmentId', removeJamDinasAssignment);

module.exports = router;
