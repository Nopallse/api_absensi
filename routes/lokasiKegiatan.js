const express = require('express');
const router = express.Router();
const lokasiKegiatanController = require('../controllers/lokasiKegiatanController');
const authMiddleware = require('../middlewares/authMiddleware');


// Routes untuk lokasi kegiatan
router.get('/', lokasiKegiatanController.getAllLokasiKegiatan);
router.get('/:id', lokasiKegiatanController.getLokasiKegiatanById);
router.post('/', lokasiKegiatanController.createLokasiKegiatan);
router.put('/:id', lokasiKegiatanController.updateLokasiKegiatan);
router.delete('/:id', lokasiKegiatanController.deleteLokasiKegiatan);
router.put('/:id/status', lokasiKegiatanController.updateStatusLokasiKegiatan);

module.exports = router;
