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
    removeLokasiFromKegiatan,
    downloadBulkExcelKegiatan
} = require('../controllers/jadwalKegiatanController');

const {
    getAllGrupPeserta,
    getGrupPesertaById,
    createGrupPeserta,
    updateGrupPeserta,
    deleteGrupPeserta,
    getPesertaGrup,
    addPesertaToGrup,
    importPesertaFromExcel,
    removePesertaFromGrup,
    getAllGrupPesertaKegiatan,
    getDetailGrupPesertaKegiatan,
    downloadGrupPesertaExcel,
    upload
} = require('../controllers/grupPesertaKegiatanController');

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

// Routes untuk grup peserta kegiatan
// GET: Dapatkan semua grup peserta untuk kegiatan dengan data kehadiran
router.get('/:id_kegiatan/grup-peserta-kehadiran', requireAdminOpd(), getAllGrupPesertaKegiatan);
// GET: Dapatkan detail grup peserta dengan data kehadiran
router.get('/:id_kegiatan/grup/:id_grup_peserta/detail', requireAdminOpd(), getDetailGrupPesertaKegiatan);
// GET: Dapatkan semua grup peserta untuk kegiatan (opsional: filter by lokasi)
router.get('/:id_kegiatan/grup-peserta', requireAdminOpd(), getAllGrupPeserta);
router.get('/:id_kegiatan/lokasi/:lokasi_id/grup-peserta', requireAdminOpd(), getAllGrupPeserta);

// GET: Dapatkan detail grup peserta
router.get('/grup-peserta/:id_grup_peserta', requireAdminOpd(), getGrupPesertaById);

// POST: Buat grup peserta baru (support multiple lokasi via body lokasi_ids, atau single lokasi via params)
router.post('/:id_kegiatan/lokasi/:lokasi_id/grup-peserta', requireAdminOpd(), createGrupPeserta);
router.post('/:id_kegiatan/grup-peserta', requireAdminOpd(), createGrupPeserta);

// PUT: Update grup peserta
router.put('/grup-peserta/:id_grup_peserta', requireAdminOpd(), updateGrupPeserta);

// DELETE: Hapus grup peserta
router.delete('/grup-peserta/:id_grup_peserta', requireAdminOpd(), deleteGrupPeserta);

// GET: Dapatkan semua peserta dalam grup
router.get('/grup-peserta/:id_grup_peserta/peserta', requireAdminOpd(), getPesertaGrup);

// POST: Tambahkan peserta ke grup
router.post('/grup-peserta/:id_grup_peserta/peserta', requireAdminOpd(), addPesertaToGrup);

// POST: Import peserta dari Excel
router.post('/grup-peserta/:id_grup_peserta/peserta/import', requireAdminOpd(), upload.single('file'), importPesertaFromExcel);

// DELETE: Hapus peserta dari grup
router.delete('/grup-peserta/:id_grup_peserta/peserta', requireAdminOpd(), removePesertaFromGrup);

// GET: Download Excel untuk grup peserta
router.get('/:id_kegiatan/grup/:id_grup_peserta/download-excel', requireAdminOpd(), downloadGrupPesertaExcel);

// GET: Bulk download Excel untuk seluruh grup peserta dalam kegiatan
router.get('/:id_kegiatan/grup/download-excel', requireAdminOpd(), downloadBulkExcelKegiatan);

module.exports = router; 