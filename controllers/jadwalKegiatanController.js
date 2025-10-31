const { MasterJadwalKegiatan, Lokasi, JadwalKegiatanLokasiSatker, SatkerTbl, MstPegawai, KehadiranKegiatan } = require('../models');
const { Op, Sequelize } = require('sequelize');
const ExcelJS = require('exceljs');
const { getTodayDate } = require('../utils/timeUtils');
// Mendapatkan jadwal kegiatan hari ini
const getJadwalHariIni = async (req, res) => {
    try {
        const today = getTodayDate();
        const todayString = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
        
        console.log('Checking jadwal for today:', todayString);
        
        const jadwalHariIni = await MasterJadwalKegiatan.findOne({
            where: {
                tanggal_kegiatan: todayString
            }
        });
        
        res.status(200).json({
            success: true,
            today: todayString,
            has_kegiatan: !!jadwalHariIni,
            jadwal: jadwalHariIni
        });
    } catch (error) {
        console.error('Get Jadwal Hari Ini Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Mendapatkan semua jadwal kegiatan
const getAllJadwalKegiatan = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const { count, rows: jadwalList } = await MasterJadwalKegiatan.findAndCountAll({
            order: [['tanggal_kegiatan', 'DESC']],
            offset,
            limit
        });
        
        res.status(200).json({
            success: true,
            data: jadwalList,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get All Jadwal Kegiatan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Menambah jadwal kegiatan baru
const createJadwalKegiatan = async (req, res) => {
    try {
        const { tanggal_kegiatan, jenis_kegiatan, keterangan, jam_mulai, jam_selesai, include_absen } = req.body;
        
        // Validasi input
        if (!tanggal_kegiatan || !jenis_kegiatan || !keterangan) {
            return res.status(400).json({
                success: false,
                error: 'Tanggal kegiatan, jenis kegiatan, dan keterangan wajib diisi'
            });
        }
        
        // Validasi jam jika ada
        if (jam_mulai && jam_selesai) {
            const jamMulai = new Date(`2000-01-01T${jam_mulai}`);
            const jamSelesai = new Date(`2000-01-01T${jam_selesai}`);
            
            if (jamMulai >= jamSelesai) {
                return res.status(400).json({
                    success: false,
                    error: 'Jam selesai harus lebih besar dari jam mulai'
                });
            }
        }
        
        // Cek apakah ada konflik waktu jika jam_mulai dan jam_selesai diisi
        if (jam_mulai && jam_selesai) {
            const existingJadwal = await MasterJadwalKegiatan.findOne({
                where: {
                    tanggal_kegiatan,
                    [Op.or]: [
                        // Jam mulai baru berada di antara jam yang sudah ada
                        {
                            jam_mulai: { [Op.lte]: jam_mulai },
                            jam_selesai: { [Op.gt]: jam_mulai }
                        },
                        // Jam selesai baru berada di antara jam yang sudah ada
                        {
                            jam_mulai: { [Op.lt]: jam_selesai },
                            jam_selesai: { [Op.gte]: jam_selesai }
                        },
                        // Jam baru mencakup jam yang sudah ada
                        {
                            jam_mulai: { [Op.gte]: jam_mulai },
                            jam_selesai: { [Op.lte]: jam_selesai }
                        }
                    ]
                }
            });
            
            if (existingJadwal) {
                return res.status(400).json({
                    success: false,
                    error: 'Sudah ada jadwal kegiatan yang bentrok dengan waktu tersebut'
                });
            }
        }
        
        const newJadwal = await MasterJadwalKegiatan.create({
            tanggal_kegiatan,
            jenis_kegiatan,
            keterangan,
            jam_mulai: jam_mulai || null,
            jam_selesai: jam_selesai || null,
            include_absen: include_absen || 'none'
        });
        
        res.status(201).json({
            success: true,
            message: 'Jadwal kegiatan berhasil ditambahkan',
            data: newJadwal
        });
    } catch (error) {
        console.error('Create Jadwal Kegiatan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update jadwal kegiatan
const updateJadwalKegiatan = async (req, res) => {
    try {
        const { id_kegiatan } = req.params;
        const { tanggal_kegiatan, jenis_kegiatan, keterangan, jam_mulai, jam_selesai, include_absen } = req.body;
        
        const jadwal = await MasterJadwalKegiatan.findByPk(id_kegiatan);
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        // Validasi jam jika ada
        if (jam_mulai && jam_selesai) {
            const jamMulai = new Date(`2000-01-01T${jam_mulai}`);
            const jamSelesai = new Date(`2000-01-01T${jam_selesai}`);
            
            if (jamMulai >= jamSelesai) {
                return res.status(400).json({
                    success: false,
                    error: 'Jam selesai harus lebih besar dari jam mulai'
                });
            }
        }
        
        // Cek apakah ada konflik waktu jika jam_mulai dan jam_selesai diisi
        if (jam_mulai && jam_selesai) {
            const targetTanggal = tanggal_kegiatan || jadwal.tanggal_kegiatan;
            const existingJadwal = await MasterJadwalKegiatan.findOne({
                where: {
                    tanggal_kegiatan: targetTanggal,
                    id_kegiatan: { [Op.ne]: id_kegiatan },
                    [Op.or]: [
                        // Jam mulai baru berada di antara jam yang sudah ada
                        {
                            jam_mulai: { [Op.lte]: jam_mulai },
                            jam_selesai: { [Op.gt]: jam_mulai }
                        },
                        // Jam selesai baru berada di antara jam yang sudah ada
                        {
                            jam_mulai: { [Op.lt]: jam_selesai },
                            jam_selesai: { [Op.gte]: jam_selesai }
                        },
                        // Jam baru mencakup jam yang sudah ada
                        {
                            jam_mulai: { [Op.gte]: jam_mulai },
                            jam_selesai: { [Op.lte]: jam_selesai }
                        }
                    ]
                }
            });
            
            if (existingJadwal) {
                return res.status(400).json({
                    success: false,
                    error: 'Sudah ada jadwal kegiatan yang bentrok dengan waktu tersebut'
                });
            }
        }
        
        await jadwal.update({
            tanggal_kegiatan: tanggal_kegiatan || jadwal.tanggal_kegiatan,
            jenis_kegiatan: jenis_kegiatan || jadwal.jenis_kegiatan,
            keterangan: keterangan || jadwal.keterangan,
            jam_mulai: jam_mulai !== undefined ? jam_mulai : jadwal.jam_mulai,
            jam_selesai: jam_selesai !== undefined ? jam_selesai : jadwal.jam_selesai,
            include_absen: include_absen !== undefined ? include_absen : jadwal.include_absen
        });
        
        res.status(200).json({
            success: true,
            message: 'Jadwal kegiatan berhasil diupdate',
            data: jadwal
        });
    } catch (error) {
        console.error('Update Jadwal Kegiatan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Hapus jadwal kegiatan
const deleteJadwalKegiatan = async (req, res) => {
    try {
        const { id_kegiatan } = req.params;
        
        const jadwal = await MasterJadwalKegiatan.findByPk(id_kegiatan);
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        await jadwal.destroy();
        
        res.status(200).json({
            success: true,
            message: 'Jadwal kegiatan berhasil dihapus'
        });
    } catch (error) {
        console.error('Delete Jadwal Kegiatan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Mendapatkan jadwal kegiatan berdasarkan ID
const getJadwalKegiatanById = async (req, res) => {
    try {
        const { id_kegiatan } = req.params;
        
        const jadwal = await MasterJadwalKegiatan.findByPk(id_kegiatan, {
            include: [
                {
                    model: Lokasi,
                    through: { attributes: [] }, // Tidak ambil data relasi
                    attributes: ['lokasi_id', 'lat', 'lng', 'ket', 'status', 'range']
                }
            ]
        });
        
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        // Dapatkan data Satker untuk setiap lokasi
        const lokasiWithSatker = [];
        if (jadwal.Lokasis && jadwal.Lokasis.length > 0) {
            for (const lokasi of jadwal.Lokasis) {
                const satkerList = await JadwalKegiatanLokasiSatker.findAll({
                    where: {
                        id_kegiatan: id_kegiatan,
                        lokasi_id: lokasi.lokasi_id
                    },
                    attributes: ['id_satker']
                });
                
                lokasiWithSatker.push({
                    ...lokasi.toJSON(),
                    satker_list: satkerList.map(s => s.id_satker) // kdskpd sekarang berisi kode satker
                });
            }
        }
        
        res.status(200).json({
            success: true,
            data: {
                ...jadwal.toJSON(),
                lokasi_list: lokasiWithSatker
            }
        });
    } catch (error) {
        console.error('Get Jadwal Kegiatan By ID Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Mendapatkan jadwal kegiatan dalam rentang tanggal
const getJadwalKegiatanByRange = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Start date dan end date harus diisi'
            });
        }
        
        const jadwalList = await MasterJadwalKegiatan.findAll({
            where: {
                tanggal_kegiatan: {
                    [Op.between]: [start_date, end_date]
                }
            },
            order: [['tanggal_kegiatan', 'ASC']]
        });
        
        res.status(200).json({
            success: true,
            data: jadwalList,
            range: {
                start_date,
                end_date
            }
        });
    } catch (error) {
        console.error('Get Jadwal Kegiatan By Range Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Mendapatkan data lokasi untuk jadwal kegiatan
const getLokasiKegiatan = async (req, res) => {
    try {
        const { id_kegiatan } = req.params;
        
        // Cek apakah jadwal kegiatan ada
        const jadwal = await MasterJadwalKegiatan.findByPk(id_kegiatan);
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        // Dapatkan semua lokasi yang terkait dengan jadwal kegiatan ini
        const lokasiKegiatan = await JadwalKegiatanLokasiSatker.findAll({
            where: { id_kegiatan },
            include: [
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'lat', 'lng', 'ket', 'status', 'range']
                }
            ],
            order: [['lokasi_id', 'ASC']]
        });
        
        // Group by lokasi_id untuk menghindari duplikasi
        const lokasiMap = new Map();
        lokasiKegiatan.forEach(item => {
            const lokasiId = item.Lokasi.lokasi_id;
            if (!lokasiMap.has(lokasiId)) {
                lokasiMap.set(lokasiId, {
                    lokasi_id: item.Lokasi.lokasi_id,
                    lat: item.Lokasi.lat,
                    lng: item.Lokasi.lng,
                    ket: item.Lokasi.ket,
                    status: item.Lokasi.status,
                    range: item.Lokasi.range,
                    satker_list: [] // kdskpd sekarang berisi kode satker
                });
            }
            lokasiMap.get(lokasiId).satker_list.push(item.id_satker);
        });
        
        const lokasiList = Array.from(lokasiMap.values());
        
        res.status(200).json({
            success: true,
            data: {
                jadwal_kegiatan: {
                    id_kegiatan: jadwal.id_kegiatan,
                    tanggal_kegiatan: jadwal.tanggal_kegiatan,
                    jenis_kegiatan: jadwal.jenis_kegiatan,
                    keterangan: jadwal.keterangan
                },
                lokasi_list: lokasiList,
                total_lokasi: lokasiList.length
            }
        });
    } catch (error) {
        console.error('Get Lokasi Kegiatan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Menambahkan lokasi ke jadwal kegiatan
const addLokasiToKegiatan = async (req, res) => {
    try {
        const { id_kegiatan } = req.params;
        const { lokasi_id, kdsatker_list } = req.body; // Ubah dari kdskpd_list ke kdsatker_list
        
        // Validasi input
        if (!lokasi_id || !kdsatker_list || !Array.isArray(kdsatker_list)) {
            return res.status(400).json({
                success: false,
                error: 'lokasi_id dan kdsatker_list (array) harus diisi'
            });
        }
        
        // Convert to proper types
        const kegiatanId = parseInt(id_kegiatan);
        const lokasiId = parseInt(lokasi_id);
        
        console.log('Input values:', {
            id_kegiatan: kegiatanId,
            lokasi_id: lokasiId,
            kdsatker_list
        });
        
        // Cek apakah jadwal kegiatan ada
        const jadwal = await MasterJadwalKegiatan.findByPk(kegiatanId);
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        // Cek apakah lokasi ada
        console.log('Checking lokasi with ID:', lokasiId);
        const lokasi = await Lokasi.findByPk(lokasiId);
        if (!lokasi) {
            return res.status(404).json({
                success: false,
                error: 'Lokasi tidak ditemukan'
            });
        }
        
        // Debug: tampilkan Satker yang sudah ada untuk lokasi ini
        const currentSatker = await JadwalKegiatanLokasiSatker.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId },
            attributes: ['id_satker']
        });
        console.log('Current Satker for this location:', currentSatker.map(s => s.id_satker));
        
        // Tambahkan Satker ke lokasi kegiatan
        const relasiList = [];
        const existingSatker = [];
        
        for (const kdsatker of kdsatker_list) {
            try {
                console.log(`Processing Satker: ${kdsatker}`);
                
                // Cek apakah kombinasi id_kegiatan, lokasi_id, dan id_satker sudah ada
                const existingRelasi = await JadwalKegiatanLokasiSatker.findOne({
                    where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId, id_satker: kdsatker }
                });
                
                if (existingRelasi) {
                    existingSatker.push(kdsatker);
                    console.log(`Satker ${kdsatker} sudah ada untuk lokasi ini`);
                    continue;
                }
                
                console.log(`Creating new relation for Satker: ${kdsatker}`);
                const relasi = await JadwalKegiatanLokasiSatker.create({
                    id_kegiatan: kegiatanId,
                    lokasi_id: lokasiId,
                    id_satker: kdsatker // Field id_satker berisi kode satker
                });
                relasiList.push(relasi);
                console.log(`Satker ${kdsatker} berhasil ditambahkan dengan ID: ${relasi.id}`);
            } catch (error) {
                // Jika ada error (misal duplikasi), skip
                console.log(`Satker ${kdsatker} error:`, error.message);
                console.log('Full error:', error);
                existingSatker.push(kdsatker);
            }
        }
        
        res.status(201).json({
            success: true,
            message: relasiList.length > 0 
                ? 'Lokasi berhasil ditambahkan ke jadwal kegiatan' 
                : 'Semua Satker sudah ada untuk lokasi ini',
            data: {
                id_kegiatan: kegiatanId,
                lokasi_id: lokasiId,
                lokasi_info: {
                    lokasi_id: lokasi.lokasi_id,
                    ket: lokasi.ket,
                    lat: lokasi.lat,
                    lng: lokasi.lng
                },
                satker_added: relasiList.length,
                satker_list: relasiList.map(r => r.id_satker),
                existing_satker: existingSatker.length > 0 ? existingSatker : undefined,
                total_requested: kdsatker_list.length,
                summary: {
                    success: relasiList.length,
                    already_exists: existingSatker.length,
                    total: kdsatker_list.length
                }
            }
        });
    } catch (error) {
        console.error('Add Lokasi To Kegiatan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Menghapus lokasi dari jadwal kegiatan
const removeLokasiFromKegiatan = async (req, res) => {
    try {
        const { id_kegiatan, lokasi_id } = req.params;
        
        // Cek apakah jadwal kegiatan ada
        const jadwal = await MasterJadwalKegiatan.findByPk(id_kegiatan);
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        // Hapus semua relasi untuk lokasi ini
        const deletedCount = await JadwalKegiatanLokasiSatker.destroy({
            where: { id_kegiatan, lokasi_id }
        });
        
        if (deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Lokasi tidak ditemukan dalam jadwal kegiatan ini'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Lokasi berhasil dihapus dari jadwal kegiatan',
            data: {
                id_kegiatan,
                lokasi_id,
                deleted_relations: deletedCount
            }
        });
    } catch (error) {
        console.error('Remove Lokasi From Kegiatan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Edit/Update lokasi pada jadwal kegiatan
const editLokasiKegiatan = async (req, res) => {
    try {
        const { id_kegiatan, lokasi_id } = req.params;
        const { new_lokasi_id } = req.body;
        
        // Validasi input
        if (!new_lokasi_id) {
            return res.status(400).json({
                success: false,
                error: 'new_lokasi_id harus diisi'
            });
        }
        
        const kegiatanId = parseInt(id_kegiatan);
        const oldLokasiId = parseInt(lokasi_id);
        const newLokasiId = parseInt(new_lokasi_id);
        
        // Cek apakah jadwal kegiatan ada
        const jadwal = await MasterJadwalKegiatan.findByPk(kegiatanId);
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        // Cek apakah lokasi lama ada
        const oldLokasi = await Lokasi.findByPk(oldLokasiId);
        if (!oldLokasi) {
            return res.status(404).json({
                success: false,
                error: 'Lokasi lama tidak ditemukan'
            });
        }
        
        // Cek apakah lokasi baru ada
        const newLokasi = await Lokasi.findByPk(newLokasiId);
        if (!newLokasi) {
            return res.status(404).json({
                success: false,
                error: 'Lokasi baru tidak ditemukan'
            });
        }
        
        // Cek apakah ada relasi dengan lokasi lama
        const existingRelations = await JadwalKegiatanLokasiSatker.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: oldLokasiId }
        });
        
        if (existingRelations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tidak ada relasi dengan lokasi lama yang ditemukan'
            });
        }
        
        // Cek apakah lokasi baru sudah digunakan untuk kegiatan ini
        const existingNewRelations = await JadwalKegiatanLokasiSatker.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: newLokasiId }
        });
        
        if (existingNewRelations.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Lokasi baru sudah digunakan untuk kegiatan ini'
            });
        }
        
        // Update semua relasi dari lokasi lama ke lokasi baru
        const updatedCount = await JadwalKegiatanLokasiSatker.update(
            { lokasi_id: newLokasiId },
            { where: { id_kegiatan: kegiatanId, lokasi_id: oldLokasiId } }
        );
        
        res.status(200).json({
            success: true,
            message: 'Lokasi kegiatan berhasil diupdate',
            data: {
                id_kegiatan: kegiatanId,
                old_lokasi: {
                    lokasi_id: oldLokasiId,
                    ket: oldLokasi.ket
                },
                new_lokasi: {
                    lokasi_id: newLokasiId,
                    ket: newLokasi.ket,
                    lat: newLokasi.lat,
                    lng: newLokasi.lng
                },
                updated_relations: updatedCount[0],
                affected_skpd: existingRelations.map(r => r.id_satker)
            }
        });
    } catch (error) {
        console.error('Edit Lokasi Kegiatan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Edit/Update daftar Satker untuk kombinasi kegiatan-lokasi
const editSkpdKegiatanLokasi = async (req, res) => {
    try {
        const { id_kegiatan, lokasi_id } = req.params;
        const { kdsatker_list } = req.body; // Ubah dari kdskpd_list ke kdsatker_list
        
        // Validasi input
        if (!kdsatker_list || !Array.isArray(kdsatker_list)) {
            return res.status(400).json({
                success: false,
                error: 'kdsatker_list (array) harus diisi'
            });
        }
        
        const kegiatanId = parseInt(id_kegiatan);
        const lokasiId = parseInt(lokasi_id);
        
        console.log('Edit Satker - Input values:', {
            id_kegiatan: kegiatanId,
            lokasi_id: lokasiId,
            kdsatker_list
        });
        
        // Cek apakah jadwal kegiatan ada
        const jadwal = await MasterJadwalKegiatan.findByPk(kegiatanId);
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        // Cek apakah lokasi ada
        const lokasi = await Lokasi.findByPk(lokasiId);
        if (!lokasi) {
            return res.status(404).json({
                success: false,
                error: 'Lokasi tidak ditemukan'
            });
        }
        
        // Ambil Satker yang sudah ada untuk kombinasi ini
        const currentSatker = await JadwalKegiatanLokasiSatker.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId }
        });
        
        const currentSatkerList = currentSatker.map(s => s.id_satker);
        console.log('Current Satker:', currentSatkerList);
        console.log('New Satker:', kdsatker_list);
        
        // Hapus semua Satker yang sudah ada
        const deletedCount = await JadwalKegiatanLokasiSatker.destroy({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId }
        });
        
        console.log('Deleted relations count:', deletedCount);
        
        // Tambahkan Satker baru
        const newRelations = [];
        const failedSatker = [];
        
        for (const kdsatker of kdsatker_list) {
            try {
                console.log(`Creating relation for Satker: ${kdsatker}`);
                const relasi = await JadwalKegiatanLokasiSatker.create({
                    id_kegiatan: kegiatanId,
                    lokasi_id: lokasiId,
                    id_satker: kdsatker // Field id_satker berisi kode satker
                });
                newRelations.push(relasi);
                console.log(`Satker ${kdsatker} berhasil ditambahkan dengan ID: ${relasi.id}`);
            } catch (error) {
                console.log(`Satker ${kdsatker} error:`, error.message);
                failedSatker.push(kdsatker);
            }
        }
        
        res.status(200).json({
            success: true,
            message: 'Daftar Satker berhasil diupdate',
            data: {
                id_kegiatan: kegiatanId,
                lokasi_id: lokasiId,
                lokasi_info: {
                    lokasi_id: lokasi.lokasi_id,
                    ket: lokasi.ket,
                    lat: lokasi.lat,
                    lng: lokasi.lng
                },
                previous_satker: currentSatkerList,
                new_satker: newRelations.map(r => r.id_satker),
                failed_satker: failedSatker.length > 0 ? failedSatker : undefined,
                summary: {
                    previous_count: currentSatkerList.length,
                    deleted_count: deletedCount,
                    new_count: newRelations.length,
                    failed_count: failedSatker.length,
                    total_requested: kdsatker_list.length
                }
            }
        });
    } catch (error) {
        console.error('Edit Satker Kegiatan Lokasi Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


const getAllSatkerKegiatan = async (req, res) => {
    try {
        const { id_kegiatan } = req.params;


        // Ambil semua relasi lokasi-satker untuk kegiatan ini
        const lokasiSatkerList = await JadwalKegiatanLokasiSatker.findAll({
            where: { id_kegiatan },
            include: [
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'ket']
                }
            ],
            order: [['id', 'ASC']]
        });

        // Dapatkan semua id_satker yang terlibat
        const satkerIds = [...new Set(lokasiSatkerList.map(relasi => relasi.id_satker))];
        
        // Dapatkan data satker
        const satkerData = await SatkerTbl.findAll({
            where: {
                KDSATKER: {
                    [Op.in]: satkerIds
                }
            },
            attributes: ['KDSATKER', 'NMSATKER']
        });

        // Dapatkan count pegawai untuk setiap satker
        const pegawaiCounts = await MstPegawai.findAll({
            where: {
                KDSATKER: {
                    [Op.in]: satkerIds
                },
                STATUSAKTIF: 'AKTIF'  // Filter hanya pegawai aktif
            },
            attributes: [
                'KDSATKER',
                [Sequelize.fn('COUNT', Sequelize.col('NIP')), 'total_pegawai']
            ],
            group: ['KDSATKER']
        });

        // Dapatkan count kehadiran kegiatan untuk setiap satker
        // Karena MstPegawai dan KehadiranKegiatan beda database, kita perlu query terpisah
        const kehadiranData = await KehadiranKegiatan.findAll({
            where: {
                id_kegiatan: id_kegiatan
            },
            attributes: ['absen_nip']
        });

        // Dapatkan NIP yang hadir
        const nipYangHadir = kehadiranData.map(k => k.absen_nip);
        
        // Dapatkan data pegawai yang hadir untuk mendapatkan satker mereka
        const pegawaiYangHadir = await MstPegawai.findAll({
            where: {
                NIP: {
                    [Op.in]: nipYangHadir
                },
                KDSATKER: {
                    [Op.in]: satkerIds
                },
                STATUSAKTIF: 'AKTIF'  // Filter hanya pegawai aktif
            },
            attributes: ['NIP', 'KDSATKER']
        });

        // Hitung kehadiran per satker
        const kehadiranPerSatker = {};
        pegawaiYangHadir.forEach(pegawai => {
            const satker = pegawai.KDSATKER;
            if (!kehadiranPerSatker[satker]) {
                kehadiranPerSatker[satker] = 0;
            }
            kehadiranPerSatker[satker]++;
        });

        // Group by id_satker, setiap satker bisa punya banyak lokasi
        const satkerMap = {};
        lokasiSatkerList.forEach(relasi => {
            const id_satker = relasi.id_satker;
            const satker = satkerData.find(s => s.KDSATKER === id_satker);
            const pegawaiCount = pegawaiCounts.find(p => p.KDSATKER === id_satker);
            
            if (!satkerMap[id_satker]) {
                satkerMap[id_satker] = {
                    id_satker,
                    nama_satker: satker ? satker.NMSATKER : null,
                    total_pegawai: pegawaiCount ? parseInt(pegawaiCount.dataValues.total_pegawai) : 0,
                    total_kehadiran: kehadiranPerSatker[id_satker] || 0,
                    lokasi: []
                };
            }
            if (relasi.Lokasi) {
                satkerMap[id_satker].lokasi.push({
                    lokasi_id: relasi.Lokasi.lokasi_id,
                    ket: relasi.Lokasi.ket
                });
            }
        });

        const satkerList = Object.values(satkerMap);

        if (!satkerList) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }


        return res.status(200).json({
            success: true,
            data: satkerList
        });
    } catch (error) {
        console.error('getAllSatkerKegiatan error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getDetailSatkerKegiatan = async (req, res) => {
    try {
        const { id_kegiatan, id_satker } = req.params;

        // Validasi parameter
        if (!id_kegiatan || !id_satker) {
            return res.status(400).json({
                success: false,
                message: 'ID kegiatan dan ID satker harus disediakan'
            });
        }

        // Dapatkan data satker
        const satkerData = await SatkerTbl.findOne({
            where: {
                KDSATKER: id_satker
            },
            attributes: ['KDSATKER', 'NMSATKER']
        });

        if (!satkerData) {
            return res.status(404).json({
                success: false,
                message: 'Satker tidak ditemukan'
            });
        }

        // Dapatkan semua pegawai aktif di satker ini
        const pegawaiList = await MstPegawai.findAll({
            where: {
                KDSATKER: id_satker,
                STATUSAKTIF: 'AKTIF'
            },
            attributes: ['NIP', 'NAMA', 'KDSATKER'],
            order: [['NAMA', 'ASC']]
        });

        // Dapatkan NIP pegawai yang hadir untuk kegiatan ini
        const kehadiranData = await KehadiranKegiatan.findAll({
            where: {
                id_kegiatan: id_kegiatan
            },
            attributes: ['absen_nip', 'absen_tgljam']
        });

        // Buat map kehadiran untuk lookup cepat
        const kehadiranMap = {};
        kehadiranData.forEach(k => {
            kehadiranMap[k.absen_nip] = {
                hadir: true,
                absen_tgljam: k.absen_tgljam,
            };
        });

        // Mapping pegawai dengan status kehadiran
        const pegawaiWithAttendance = pegawaiList.map(pegawai => {
            const kehadiran = kehadiranMap[pegawai.NIP];
            return {
                nip: pegawai.NIP,
                nama: pegawai.NAMA,
                nama_lengkap: `${pegawai.GLRDEPAN || ''} ${pegawai.NAMA} ${pegawai.GLRBELAKANG || ''}`.trim(),
                hadir: !!kehadiran,
                kehadiran_data: kehadiran ? {
                    absen_tgljam: kehadiran.absen_tgljam,
                } : null
            };
        });

        // Hitung statistik
        const totalPegawai = pegawaiWithAttendance.length;
        const totalHadir = pegawaiWithAttendance.filter(p => p.hadir).length;
        const totalTidakHadir = totalPegawai - totalHadir;
        const persentaseKehadiran = totalPegawai > 0 ? Math.round((totalHadir / totalPegawai) * 100) : 0;

        return res.status(200).json({
            success: true,
            data: {
                satker: {
                    id_satker: satkerData.KDSATKER,
                    nama_satker: satkerData.NMSATKER
                },
                statistik: {
                    total_pegawai: totalPegawai,
                    total_hadir: totalHadir,
                    total_tidak_hadir: totalTidakHadir,
                    persentase_kehadiran: persentaseKehadiran
                },
                pegawai: pegawaiWithAttendance
            }
        });

    } catch (error) {
        console.error('getDetailSatkerKegiatan error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Download Excel untuk semua satker dalam kegiatan
const downloadBulkExcelKegiatan = async (req, res) => {
    try {
        const { id_kegiatan } = req.params;

        // Dapatkan data kegiatan
        const kegiatan = await MasterJadwalKegiatan.findByPk(id_kegiatan);
        if (!kegiatan) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }

        // Dapatkan semua satker untuk kegiatan ini
        const lokasiSatkerList = await JadwalKegiatanLokasiSatker.findAll({
            where: { id_kegiatan },
            include: [
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'ket']
                }
            ],
            order: [['id', 'ASC']]
        });

        const satkerIds = [...new Set(lokasiSatkerList.map(relasi => relasi.id_satker))];
        
        // Dapatkan data satker
        const satkerData = await SatkerTbl.findAll({
            where: {
                KDSATKER: {
                    [Op.in]: satkerIds
                }
            },
            attributes: ['KDSATKER', 'NMSATKER']
        });

        // Dapatkan semua pegawai aktif untuk semua satker
        const allPegawaiList = await MstPegawai.findAll({
            where: {
                KDSATKER: {
                    [Op.in]: satkerIds
                },
                STATUSAKTIF: 'AKTIF'
            },
            attributes: ['NIP', 'NAMA', 'GLRDEPAN', 'GLRBELAKANG', 'KDSATKER'],
            order: [['KDSATKER', 'ASC'], ['NAMA', 'ASC']]
        });

        // Dapatkan NIP pegawai yang hadir untuk kegiatan ini
        const kehadiranData = await KehadiranKegiatan.findAll({
            where: {
                id_kegiatan: id_kegiatan
            },
            attributes: ['absen_nip', 'absen_tgljam', 'absen_kat']
        });

        // Buat map kehadiran untuk lookup cepat
        const kehadiranMap = {};
        kehadiranData.forEach(k => {
            kehadiranMap[k.absen_nip] = {
                hadir: true,
                absen_tgljam: k.absen_tgljam,
                absen_kat: k.absen_kat
            };
        });

        // Buat workbook Excel
        const workbook = new ExcelJS.Workbook();

        // Buat sheet untuk setiap satker
        const satkerMap = {};
        
        lokasiSatkerList.forEach(relasi => {
            const id_satker = relasi.id_satker;
            const satker = satkerData.find(s => s.KDSATKER === id_satker);
            
            if (!satkerMap[id_satker]) {
                satkerMap[id_satker] = {
                    id_satker,
                    nama_satker: satker ? satker.NMSATKER : null,
                    lokasi: []
                };
            }
            if (relasi.Lokasi) {
                satkerMap[id_satker].lokasi.push(relasi.Lokasi.ket);
            }
        });

        // Buat sheet untuk setiap satker
        Object.values(satkerMap).forEach(satker => {
            // Filter pegawai untuk satker ini
            const pegawaiSatker = allPegawaiList.filter(p => p.KDSATKER === satker.id_satker);
            
            // Mapping pegawai dengan status kehadiran
            const pegawaiWithAttendance = pegawaiSatker.map(pegawai => {
                const kehadiran = kehadiranMap[pegawai.NIP];
                return {
                    nip: pegawai.NIP,
                    nama: pegawai.NAMA,
                    gelar_depan: pegawai.GLRDEPAN || '',
                    gelar_belakang: pegawai.GLRBELAKANG || '',
                    nama_lengkap: `${pegawai.GLRDEPAN || ''} ${pegawai.NAMA} ${pegawai.GLRBELAKANG || ''}`.trim(),
                    hadir: !!kehadiran,
                    kehadiran_data: kehadiran ? {
                        absen_tgljam: kehadiran.absen_tgljam,
                        absen_kat: kehadiran.absen_kat
                    } : null
                };
            });

            // Hitung statistik
            const totalPegawai = pegawaiWithAttendance.length;
            const totalHadir = pegawaiWithAttendance.filter(p => p.hadir).length;
            const totalTidakHadir = totalPegawai - totalHadir;
            const persentaseKehadiran = totalPegawai > 0 ? Math.round((totalHadir / totalPegawai) * 100) : 0;

            // Buat worksheet untuk satker ini
            const worksheet = workbook.addWorksheet(satker.nama_satker || `Satker ${satker.id_satker}`);

            // Tambahkan informasi laporan di atas
            const titleRow = worksheet.addRow(['', '', '', 'LAPORAN KEHADIRAN PEGAWAI']);
            titleRow.font = { bold: true, size: 16 };
            titleRow.alignment = { horizontal: 'center' };
            worksheet.addRow([]);
            
            worksheet.addRow(['', '', 'Satuan Kerja', `: ${satker.nama_satker}`]);
            worksheet.addRow(['', '', 'Tanggal Kegiatan', `: ${new Date(kegiatan.tanggal_kegiatan).toLocaleDateString('id-ID')}`]);
            worksheet.addRow(['', '', 'Waktu kegiatan', `: ${kegiatan.jam_mulai} - ${kegiatan.jam_selesai}`]);
            worksheet.addRow(['', '', 'Nama kegiatan', `: ${kegiatan.keterangan}`]);
            worksheet.addRow(['', '', 'Jenis Kegiatan', `: ${kegiatan.jenis_kegiatan}`]);
            worksheet.addRow([]);
            
            const summaryTitleRow = worksheet.addRow(['', '', 'RINGKASAN KEHADIRAN']);
            summaryTitleRow.font = { bold: true, size: 14 };
            worksheet.addRow(['', '', 'Total Pegawai', `: ${totalPegawai}`]);
            worksheet.addRow(['', '', 'Total Hadir', `: ${totalHadir}`]);
            worksheet.addRow(['', '', 'Total Tidak Hadir', `: ${totalTidakHadir}`]);
            worksheet.addRow(['', '', 'Persentase Kehadiran', `: ${persentaseKehadiran}%`]);
            worksheet.addRow([]);

            // Set header tabel dengan space di kiri
            worksheet.addRow(['', 'No', 'NIP', 'Nama Lengkap', 'Status Kehadiran', 'Waktu Kehadiran']);
            
            // Style header tabel
            const headerRow = worksheet.lastRow;
            headerRow.font = { bold: true };
            // Hanya beri warna pada cell header dari kolom awal (No) sampai kolom terakhir (Waktu Kehadiran)
            for (let col = 2; col <= 6; col++) {
                const cell = headerRow.getCell(col);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE6F3FF' }
                };
            }

            // Set column widths dengan space di kolom pertama
            worksheet.getColumn(1).width = 3;   // Space/Empty column
            worksheet.getColumn(2).width = 5;   // No
            worksheet.getColumn(3).width = 20;  // NIP
            worksheet.getColumn(4).width = 50;  // Nama Lengkap
            worksheet.getColumn(5).width = 20;  // Status Kehadiran
            worksheet.getColumn(6).width = 20;  // Waktu Kehadiran

            // Tambahkan border pada header tabel
            for (let col = 2; col <= 6; col++) {
                const cell = headerRow.getCell(col);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }

            // Tambahkan data dan border pada setiap row data
            pegawaiWithAttendance.forEach((pegawai, index) => {
                const waktuKehadiran = pegawai.kehadiran_data 
                    ? new Date(pegawai.kehadiran_data.absen_tgljam).toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : '-';
                
                const dataRow = worksheet.addRow([
                    '', // Space column
                    index + 1,
                    pegawai.nip,
                    pegawai.nama_lengkap,
                    pegawai.hadir ? 'Hadir' : 'Tidak Hadir',
                    waktuKehadiran
                ]);

                // Beri warna hanya pada kolom status kehadiran (kolom ke-5)
                // Hadir: hijau muda, Tidak Hadir: merah muda
                const fillColor = pegawai.hadir
                    ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFFFE0' } } // light green
                    : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } }; // light red

                dataRow.getCell(5).fill = fillColor;

                // Tambahkan border pada setiap cell di row data (kolom 2-6)
                for (let col = 2; col <= 6; col++) {
                    const cell = dataRow.getCell(col);
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            });
        });

        // Set filename
        const tanggalKegiatan = new Date(kegiatan.tanggal_kegiatan).toLocaleDateString('id-ID');
        const filename = `Laporan_Kehadiran_Semua_Satker_${kegiatan.jenis_kegiatan.replace(/\s+/g, '_')}_${tanggalKegiatan.replace(/\//g, '-')}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('downloadBulkExcelKegiatan error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Download Excel untuk detail satker
const downloadSatkerExcelKegiatan = async (req, res) => {
    try {
        const { id_kegiatan, id_satker } = req.params;

        // Validasi parameter
        if (!id_kegiatan || !id_satker) {
            return res.status(400).json({
                success: false,
                message: 'ID kegiatan dan ID satker harus disediakan'
            });
        }

        // Dapatkan data kegiatan
        const kegiatan = await MasterJadwalKegiatan.findByPk(id_kegiatan);
        if (!kegiatan) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }

        // Dapatkan data satker
        const satkerData = await SatkerTbl.findOne({
            where: {
                KDSATKER: id_satker
            },
            attributes: ['KDSATKER', 'NMSATKER']
        });

        if (!satkerData) {
            return res.status(404).json({
                success: false,
                message: 'Satker tidak ditemukan'
            });
        }

        // Dapatkan semua pegawai aktif di satker ini
        const pegawaiList = await MstPegawai.findAll({
            where: {
                KDSATKER: id_satker,
                STATUSAKTIF: 'AKTIF'
            },
            attributes: ['NIP', 'NAMA', 'GLRDEPAN', 'GLRBELAKANG', 'KDSATKER'],
            order: [['NAMA', 'ASC']]
        });

        // Dapatkan NIP pegawai yang hadir untuk kegiatan ini
        const kehadiranData = await KehadiranKegiatan.findAll({
            where: {
                id_kegiatan: id_kegiatan
            },
            attributes: ['absen_nip', 'absen_tgljam', 'absen_kat']
        });

        // Buat map kehadiran untuk lookup cepat
        const kehadiranMap = {};
        kehadiranData.forEach(k => {
            kehadiranMap[k.absen_nip] = {
                hadir: true,
                absen_tgljam: k.absen_tgljam,
                absen_kat: k.absen_kat
            };
        });

        // Mapping pegawai dengan status kehadiran
        const pegawaiWithAttendance = pegawaiList.map(pegawai => {
            const kehadiran = kehadiranMap[pegawai.NIP];
            return {
                nip: pegawai.NIP,
                nama: pegawai.NAMA,
                gelar_depan: pegawai.GLRDEPAN || '',
                gelar_belakang: pegawai.GLRBELAKANG || '',
                nama_lengkap: `${pegawai.GLRDEPAN || ''} ${pegawai.NAMA} ${pegawai.GLRBELAKANG || ''}`.trim(),
                hadir: !!kehadiran,
                kehadiran_data: kehadiran ? {
                    absen_tgljam: kehadiran.absen_tgljam,
                    absen_kat: kehadiran.absen_kat
                } : null
            };
        });

        // Hitung statistik
        const totalPegawai = pegawaiWithAttendance.length;
        const totalHadir = pegawaiWithAttendance.filter(p => p.hadir).length;
        const totalTidakHadir = totalPegawai - totalHadir;
        const persentaseKehadiran = totalPegawai > 0 ? Math.round((totalHadir / totalPegawai) * 100) : 0;

        // Buat workbook Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Kehadiran Pegawai');

        // Tambahkan informasi laporan di atas
        const titleRow = worksheet.addRow(['', '', '', 'LAPORAN KEHADIRAN PEGAWAI']);
        titleRow.font = { bold: true, size: 16 };
        titleRow.alignment = { horizontal: 'center' };
        worksheet.addRow([]);
        
        worksheet.addRow(['', '', 'Satuan Kerja',  `: ${satkerData.NMSATKER}`]);
        worksheet.addRow(['', '', 'Tanggal Kegiatan',  `: ${new Date(kegiatan.tanggal_kegiatan).toLocaleDateString('id-ID')}`]);
        worksheet.addRow(['', '', 'Waktu kegiatan',  `: ${kegiatan.jam_mulai} - ${kegiatan.jam_selesai}`]);
        worksheet.addRow(['', '', 'Nama kegiatan',  `: ${kegiatan.keterangan}`]);
        worksheet.addRow(['', '', 'Jenis Kegiatan',  `: ${kegiatan.jenis_kegiatan}`]);
        worksheet.addRow([]);
        
        const summaryTitleRow = worksheet.addRow(['', '', 'RINGKASAN KEHADIRAN']);
        summaryTitleRow.font = { bold: true, size: 14 };
        worksheet.addRow(['', '', 'Total Pegawai',  `: ${totalPegawai}`]);
        worksheet.addRow(['', '', 'Total Hadir',  `: ${totalHadir}`]);
        worksheet.addRow(['', '', 'Total Tidak Hadir',  `: ${totalTidakHadir}`]);
        worksheet.addRow(['', '', 'Persentase Kehadiran',  `: ${persentaseKehadiran}%`]);
        worksheet.addRow([]);

        // Set header tabel dengan space di kiri
        worksheet.addRow(['', 'No', 'NIP', 'Nama Lengkap', 'Status Kehadiran', 'Waktu Kehadiran']);
        
        // Style header tabel
        const headerRow = worksheet.lastRow;
        headerRow.font = { bold: true };
        // Hanya beri warna pada cell header dari kolom awal (No) sampai kolom terakhir (Waktu Kehadiran)
        for (let col = 2; col <= 6; col++) {
            const cell = headerRow.getCell(col);
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6F3FF' }
            };
        }

        // Set column widths dengan space di kolom pertama
        worksheet.getColumn(1).width = 3;   // Space/Empty column
        worksheet.getColumn(2).width = 5;   // No
        worksheet.getColumn(3).width = 20;  // NIP
        worksheet.getColumn(4).width = 50;  // Nama Lengkap
        worksheet.getColumn(5).width = 20;  // Status Kehadiran
        worksheet.getColumn(6).width = 20;  // Waktu Kehadiran

        // Tambahkan border pada header tabel
        for (let col = 2; col <= 6; col++) {
            const cell = headerRow.getCell(col);
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }

        // Tambahkan data dan border pada setiap row data
        pegawaiWithAttendance.forEach((pegawai, index) => {
            const waktuKehadiran = pegawai.kehadiran_data 
                ? new Date(pegawai.kehadiran_data.absen_tgljam).toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : '-';
            
            const dataRow = worksheet.addRow([
                '', // Space column
                index + 1,
                pegawai.nip,
                pegawai.nama_lengkap,
                pegawai.hadir ? 'Hadir' : 'Tidak Hadir',
                waktuKehadiran
            ]);

            // Beri warna hanya pada kolom status kehadiran (kolom ke-5)
            // Hadir: hijau muda, Tidak Hadir: merah muda
            const fillColor = pegawai.hadir
                ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFFFE0' } } // light green
                : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } }; // light red

            dataRow.getCell(5).fill = fillColor;

            // Tambahkan border pada setiap cell di row data (kolom 2-6)
            for (let col = 2; col <= 6; col++) {
                const cell = dataRow.getCell(col);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        });

        // Set filename
        const tanggalKegiatan = new Date(kegiatan.tanggal_kegiatan).toLocaleDateString('id-ID');
        const filename = `Laporan_Kehadiran_${satkerData.NMSATKER.replace(/\s+/g, '_')}_${tanggalKegiatan.replace(/\//g, '-')}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('downloadSatkerExcelKegiatan error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
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
    editLokasiKegiatan,
    editSkpdKegiatanLokasi,
    getAllSatkerKegiatan,
    getDetailSatkerKegiatan,
    downloadBulkExcelKegiatan,
    downloadSatkerExcelKegiatan
}; 