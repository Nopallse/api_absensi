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
        const { tanggal_kegiatan, jenis_kegiatan, keterangan } = req.body;
        
        // Validasi input
        if (!tanggal_kegiatan || !jenis_kegiatan || !keterangan) {
            return res.status(400).json({
                success: false,
                error: 'Semua field harus diisi'
            });
        }
        
        // Cek apakah sudah ada jadwal untuk tanggal tersebut
        const existingJadwal = await MasterJadwalKegiatan.findOne({
            where: { tanggal_kegiatan }
        });
        
        if (existingJadwal) {
            return res.status(400).json({
                success: false,
                error: 'Sudah ada jadwal kegiatan untuk tanggal tersebut'
            });
        }
        
        const newJadwal = await MasterJadwalKegiatan.create({
            tanggal_kegiatan,
            jenis_kegiatan,
            keterangan
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
        const { tanggal_kegiatan, jenis_kegiatan, keterangan } = req.body;
        
        const jadwal = await MasterJadwalKegiatan.findByPk(id_kegiatan);
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        // Jika tanggal diubah, cek apakah sudah ada jadwal lain untuk tanggal tersebut
        if (tanggal_kegiatan && tanggal_kegiatan !== jadwal.tanggal_kegiatan) {
            const existingJadwal = await MasterJadwalKegiatan.findOne({
                where: { 
                    tanggal_kegiatan,
                    id_kegiatan: { [Op.ne]: id_kegiatan }
                }
            });
            
            if (existingJadwal) {
                return res.status(400).json({
                    success: false,
                    error: 'Sudah ada jadwal kegiatan untuk tanggal tersebut'
                });
            }
        }
        
        await jadwal.update({
            tanggal_kegiatan: tanggal_kegiatan || jadwal.tanggal_kegiatan,
            jenis_kegiatan: jenis_kegiatan || jadwal.jenis_kegiatan,
            keterangan: keterangan || jadwal.keterangan
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
        
        // Dapatkan data SKPD untuk setiap lokasi
        const lokasiWithSkpd = [];
        if (jadwal.Lokasis && jadwal.Lokasis.length > 0) {
            for (const lokasi of jadwal.Lokasis) {
                const skpdList = await JadwalKegiatanLokasiSkpd.findAll({
                    where: {
                        id_kegiatan: id_kegiatan,
                        lokasi_id: lokasi.lokasi_id
                    },
                    attributes: ['kdskpd']
                });
                
                lokasiWithSkpd.push({
                    ...lokasi.toJSON(),
                    skpd_list: skpdList.map(s => s.kdskpd)
                });
            }
        }
        
        res.status(200).json({
            success: true,
            data: {
                ...jadwal.toJSON(),
                lokasi_list: lokasiWithSkpd
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
                    skpd_list: []
                });
            }
            lokasiMap.get(lokasiId).skpd_list.push(item.kdskpd);
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
        const { lokasi_id, kdskpd_list } = req.body;
        
        // Validasi input
        if (!lokasi_id || !kdskpd_list || !Array.isArray(kdskpd_list)) {
            return res.status(400).json({
                success: false,
                error: 'lokasi_id dan kdskpd_list (array) harus diisi'
            });
        }
        
        // Convert to proper types
        const kegiatanId = parseInt(id_kegiatan);
        const lokasiId = parseInt(lokasi_id);
        
        console.log('Input values:', {
            id_kegiatan: kegiatanId,
            lokasi_id: lokasiId,
            kdskpd_list
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
        
        // Debug: tampilkan SKPD yang sudah ada untuk lokasi ini
        const currentSkpd = await JadwalKegiatanLokasiSkpd.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId },
            attributes: ['kdskpd']
        });
        console.log('Current SKPD for this location:', currentSkpd.map(s => s.kdskpd));
        
        // Tambahkan SKPD ke lokasi kegiatan
        const relasiList = [];
        const existingSkpd = [];
        
        for (const kdskpd of kdskpd_list) {
            try {
                console.log(`Processing SKPD: ${kdskpd}`);
                
                // Cek apakah kombinasi id_kegiatan, lokasi_id, dan kdskpd sudah ada
                const existingRelasi = await JadwalKegiatanLokasiSkpd.findOne({
                    where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId, kdskpd }
                });
                
                if (existingRelasi) {
                    existingSkpd.push(kdskpd);
                    console.log(`SKPD ${kdskpd} sudah ada untuk lokasi ini`);
                    continue;
                }
                
                console.log(`Creating new relation for SKPD: ${kdskpd}`);
                const relasi = await JadwalKegiatanLokasiSkpd.create({
                    id_kegiatan: kegiatanId,
                    lokasi_id: lokasiId,
                    kdskpd
                });
                relasiList.push(relasi);
                console.log(`SKPD ${kdskpd} berhasil ditambahkan dengan ID: ${relasi.id}`);
            } catch (error) {
                // Jika ada error (misal duplikasi), skip
                console.log(`SKPD ${kdskpd} error:`, error.message);
                console.log('Full error:', error);
                existingSkpd.push(kdskpd);
            }
        }
        
        res.status(201).json({
            success: true,
            message: relasiList.length > 0 
                ? 'Lokasi berhasil ditambahkan ke jadwal kegiatan' 
                : 'Semua SKPD sudah ada untuk lokasi ini',
            data: {
                id_kegiatan: kegiatanId,
                lokasi_id: lokasiId,
                lokasi_info: {
                    lokasi_id: lokasi.lokasi_id,
                    ket: lokasi.ket,
                    lat: lokasi.lat,
                    lng: lokasi.lng
                },
                skpd_added: relasiList.length,
                skpd_list: relasiList.map(r => r.kdskpd),
                existing_skpd: existingSkpd.length > 0 ? existingSkpd : undefined,
                total_requested: kdskpd_list.length,
                summary: {
                    success: relasiList.length,
                    already_exists: existingSkpd.length,
                    total: kdskpd_list.length
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

// Edit/Update daftar SKPD untuk kombinasi kegiatan-lokasi
const editSkpdKegiatanLokasi = async (req, res) => {
    try {
        const { id_kegiatan, lokasi_id } = req.params;
        const { kdskpd_list } = req.body;
        
        // Validasi input
        if (!kdskpd_list || !Array.isArray(kdskpd_list)) {
            return res.status(400).json({
                success: false,
                error: 'kdskpd_list (array) harus diisi'
            });
        }
        
        const kegiatanId = parseInt(id_kegiatan);
        const lokasiId = parseInt(lokasi_id);
        
        console.log('Edit SKPD - Input values:', {
            id_kegiatan: kegiatanId,
            lokasi_id: lokasiId,
            kdskpd_list
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
        
        // Ambil SKPD yang sudah ada untuk kombinasi ini
        const currentSkpd = await JadwalKegiatanLokasiSkpd.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId }
        });
        
        const currentSkpdList = currentSkpd.map(s => s.kdskpd);
        console.log('Current SKPD:', currentSkpdList);
        console.log('New SKPD:', kdskpd_list);
        
        // Hapus semua SKPD yang sudah ada
        const deletedCount = await JadwalKegiatanLokasiSkpd.destroy({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId }
        });
        
        console.log('Deleted relations count:', deletedCount);
        
        // Tambahkan SKPD baru
        const newRelations = [];
        const failedSkpd = [];
        
        for (const kdskpd of kdskpd_list) {
            try {
                console.log(`Creating relation for SKPD: ${kdskpd}`);
                const relasi = await JadwalKegiatanLokasiSkpd.create({
                    id_kegiatan: kegiatanId,
                    lokasi_id: lokasiId,
                    kdskpd
                });
                newRelations.push(relasi);
                console.log(`SKPD ${kdskpd} berhasil ditambahkan dengan ID: ${relasi.id}`);
            } catch (error) {
                console.log(`SKPD ${kdskpd} error:`, error.message);
                failedSkpd.push(kdskpd);
            }
        }
        
        res.status(200).json({
            success: true,
            message: 'Daftar SKPD berhasil diupdate',
            data: {
                id_kegiatan: kegiatanId,
                lokasi_id: lokasiId,
                lokasi_info: {
                    lokasi_id: lokasi.lokasi_id,
                    ket: lokasi.ket,
                    lat: lokasi.lat,
                    lng: lokasi.lng
                },
                previous_skpd: currentSkpdList,
                new_skpd: newRelations.map(r => r.kdskpd),
                failed_skpd: failedSkpd.length > 0 ? failedSkpd : undefined,
                summary: {
                    previous_count: currentSkpdList.length,
                    deleted_count: deletedCount,
                    new_count: newRelations.length,
                    failed_count: failedSkpd.length,
                    total_requested: kdskpd_list.length
                }
            }
        });
    } catch (error) {
        console.error('Edit SKPD Kegiatan Lokasi Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    editSkpdKegiatanLokasi
}; 