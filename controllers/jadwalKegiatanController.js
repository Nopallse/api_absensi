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
        
        // Cek apakah jadwal kegiatan ada
        const jadwal = await MasterJadwalKegiatan.findByPk(id_kegiatan);
        if (!jadwal) {
            return res.status(404).json({
                success: false,
                error: 'Jadwal kegiatan tidak ditemukan'
            });
        }
        
        // Cek apakah lokasi ada
        const lokasi = await Lokasi.findByPk(lokasi_id);
        if (!lokasi) {
            return res.status(404).json({
                success: false,
                error: 'Lokasi tidak ditemukan'
            });
        }
        
        // Cek apakah sudah ada relasi untuk lokasi ini
        const existingRelasi = await JadwalKegiatanLokasiSkpd.findOne({
            where: { id_kegiatan, lokasi_id }
        });
        
        if (existingRelasi) {
            return res.status(400).json({
                success: false,
                error: 'Lokasi sudah ditambahkan ke jadwal kegiatan ini'
            });
        }
        
        // Tambahkan SKPD ke lokasi kegiatan
        const relasiList = [];
        for (const kdskpd of kdskpd_list) {
            try {
                const relasi = await JadwalKegiatanLokasiSkpd.create({
                    id_kegiatan,
                    lokasi_id,
                    kdskpd
                });
                relasiList.push(relasi);
            } catch (error) {
                // Jika ada error (misal duplikasi), skip
                console.log(`SKPD ${kdskpd} sudah ada atau error:`, error.message);
            }
        }
        
        res.status(201).json({
            success: true,
            message: 'Lokasi berhasil ditambahkan ke jadwal kegiatan',
            data: {
                id_kegiatan,
                lokasi_id,
                lokasi_info: {
                    lokasi_id: lokasi.lokasi_id,
                    ket: lokasi.ket,
                    lat: lokasi.lat,
                    lng: lokasi.lng
                },
                skpd_added: relasiList.length,
                skpd_list: relasiList.map(r => r.kdskpd)
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
    removeLokasiFromKegiatan
}; 