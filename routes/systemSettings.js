const express = require('express');
const router = express.Router();
const systemSettingController = require('../controllers/systemSettingController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Semua route memerlukan autentikasi
router.use(authMiddleware);

// Get all settings
router.get('/', systemSettingController.getAllSettings);

// Get current tipe jadwal
router.get('/tipe-jadwal', systemSettingController.getCurrentTipeJadwal);

// Update tipe jadwal global
router.put('/tipe-jadwal', systemSettingController.updateGlobalTipeJadwal);

module.exports = router;
