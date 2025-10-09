const { MasterJadwalKegiatan, Lokasi, JadwalKegiatanLokasiSkpd } = require('../models');
const { Op } = require('sequelize');

// Mendapatkan jadwal kegiatan hari ini
const getJadwalHariIni = async (req, res) => {
    try {
        const today = new Date();
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
        const { tanggal_kegiatan, jenis_kegiatan, keterangan, jam_mulai, jam_selesai } = req.body;
        
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
            jam_selesai: jam_selesai || null
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
        const { tanggal_kegiatan, jenis_kegiatan, keterangan, jam_mulai, jam_selesai } = req.body;
        
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
            jam_selesai: jam_selesai !== undefined ? jam_selesai : jadwal.jam_selesai
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
                const satkerList = await JadwalKegiatanLokasiSkpd.findAll({
                    where: {
                        id_kegiatan: id_kegiatan,
                        lokasi_id: lokasi.lokasi_id
                    },
                    attributes: ['kdskpd']
                });
                
                lokasiWithSatker.push({
                    ...lokasi.toJSON(),
                    satker_list: satkerList.map(s => s.kdskpd) // kdskpd sekarang berisi kode satker
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
        const lokasiKegiatan = await JadwalKegiatanLokasiSkpd.findAll({
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
            lokasiMap.get(lokasiId).satker_list.push(item.kdskpd);
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
        const currentSatker = await JadwalKegiatanLokasiSkpd.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId },
            attributes: ['kdskpd']
        });
        console.log('Current Satker for this location:', currentSatker.map(s => s.kdskpd));
        
        // Tambahkan Satker ke lokasi kegiatan
        const relasiList = [];
        const existingSatker = [];
        
        for (const kdsatker of kdsatker_list) {
            try {
                console.log(`Processing Satker: ${kdsatker}`);
                
                // Cek apakah kombinasi id_kegiatan, lokasi_id, dan kdsatker sudah ada
                const existingRelasi = await JadwalKegiatanLokasiSkpd.findOne({
                    where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId, kdskpd: kdsatker }
                });
                
                if (existingRelasi) {
                    existingSatker.push(kdsatker);
                    console.log(`Satker ${kdsatker} sudah ada untuk lokasi ini`);
                    continue;
                }
                
                console.log(`Creating new relation for Satker: ${kdsatker}`);
                const relasi = await JadwalKegiatanLokasiSkpd.create({
                    id_kegiatan: kegiatanId,
                    lokasi_id: lokasiId,
                    kdskpd: kdsatker // Field kdskpd tetap sama, tapi sekarang berisi kode satker
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
                satker_list: relasiList.map(r => r.kdskpd),
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
        const deletedCount = await JadwalKegiatanLokasiSkpd.destroy({
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
        const existingRelations = await JadwalKegiatanLokasiSkpd.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: oldLokasiId }
        });
        
        if (existingRelations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tidak ada relasi dengan lokasi lama yang ditemukan'
            });
        }
        
        // Cek apakah lokasi baru sudah digunakan untuk kegiatan ini
        const existingNewRelations = await JadwalKegiatanLokasiSkpd.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: newLokasiId }
        });
        
        if (existingNewRelations.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Lokasi baru sudah digunakan untuk kegiatan ini'
            });
        }
        
        // Update semua relasi dari lokasi lama ke lokasi baru
        const updatedCount = await JadwalKegiatanLokasiSkpd.update(
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
                affected_skpd: existingRelations.map(r => r.kdskpd)
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
        const currentSatker = await JadwalKegiatanLokasiSkpd.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId }
        });
        
        const currentSatkerList = currentSatker.map(s => s.kdskpd);
        console.log('Current Satker:', currentSatkerList);
        console.log('New Satker:', kdsatker_list);
        
        // Hapus semua Satker yang sudah ada
        const deletedCount = await JadwalKegiatanLokasiSkpd.destroy({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId }
        });
        
        console.log('Deleted relations count:', deletedCount);
        
        // Tambahkan Satker baru
        const newRelations = [];
        const failedSatker = [];
        
        for (const kdsatker of kdsatker_list) {
            try {
                console.log(`Creating relation for Satker: ${kdsatker}`);
                const relasi = await JadwalKegiatanLokasiSkpd.create({
                    id_kegiatan: kegiatanId,
                    lokasi_id: lokasiId,
                    kdskpd: kdsatker // Field kdskpd tetap sama, tapi sekarang berisi kode satker
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
                new_satker: newRelations.map(r => r.kdskpd),
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

        // Cari kegiatan beserta relasi Satker-nya
        const kegiatan = await MasterJadwalKegiatan.findByPk(id_kegiatan,
            {
            include: [
                {
                    model: JadwalKegiatanLokasiSkpd,
                    as: 'satker_relasi',
                }
            ]
        });

        if (!kegiatan) {
            return res.status(404).json({
                success: false,
                message: 'Kegiatan tidak ditemukan'
            });
        }


        return res.status(200).json({
            success: true,
            data: kegiatan
        });
    } catch (error) {
        console.error('getAllSatkerKegiatan error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getDetailSatkerKegiatan = async (req,res) => {
    const {id_kegiatan, id_satker} = req.params

}

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
    getDetailSatkerKegiatan
}; 