const { MasterJadwalKegiatan, Lokasi, JadwalKegiatanLokasiSatker, MstPegawai } = require('../models');
const { Op } = require('sequelize');

// Menambah SKPD ke lokasi kegiatan
const addSkpdToKegiatanLokasi = async (req, res) => {
    try {
        const { id_kegiatan, lokasi_id, id_satker } = req.body;
        
        // Validasi input
        if (!id_kegiatan || !lokasi_id || !id_satker) {
            return res.status(400).json({
                success: false,
                error: 'ID kegiatan, lokasi_id, dan id_satker harus diisi'
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
        
        // Cek apakah Satker sudah ada di lokasi ini untuk kegiatan ini
        const existingRelasi = await JadwalKegiatanLokasiSatker.findOne({
            where: {
                id_kegiatan,
                lokasi_id,
                id_satker
            }
        });
        
        if (existingRelasi) {
            return res.status(400).json({
                success: false,
                error: 'Satker sudah terkait dengan lokasi ini untuk kegiatan ini'
            });
        }
        
        // Buat relasi baru
        const newRelasi = await JadwalKegiatanLokasiSatker.create({
            id_kegiatan,
            lokasi_id,
            id_satker
        });
        
        res.status(201).json({
            success: true,
            message: 'Satker berhasil ditambahkan ke lokasi kegiatan',
            data: newRelasi
        });
    } catch (error) {
        console.error('Add SKPD To Kegiatan Lokasi Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Menghapus Satker dari lokasi kegiatan
const removeSkpdFromKegiatanLokasi = async (req, res) => {
    try {
        const { id_kegiatan, lokasi_id, id_satker } = req.params;
        
        const relasi = await JadwalKegiatanLokasiSatker.findOne({
            where: {
                id_kegiatan,
                lokasi_id,
                id_satker
            }
        });
        
        if (!relasi) {
            return res.status(404).json({
                success: false,
                error: 'Relasi Satker dengan lokasi kegiatan tidak ditemukan'
            });
        }
        
        await relasi.destroy();
        
        res.status(200).json({
            success: true,
            message: 'Satker berhasil dihapus dari lokasi kegiatan'
        });
    } catch (error) {
        console.error('Remove SKPD From Kegiatan Lokasi Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Mendapatkan semua Satker untuk lokasi kegiatan tertentu
const getSkpdByKegiatanLokasi = async (req, res) => {
    try {
        const { id_kegiatan, lokasi_id } = req.params;
        
        const satkerList = await JadwalKegiatanLokasiSatker.findAll({
            where: {
                id_kegiatan,
                lokasi_id
            },
            include: [
                {
                    model: MasterJadwalKegiatan,
                    attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan']
                },
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'lat', 'lng', 'ket', 'status']
                }
            ]
        });
        
        res.status(200).json({
            success: true,
            data: satkerList,
            total_satker: satkerList.length
        });
    } catch (error) {
        console.error('Get SKPD By Kegiatan Lokasi Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Mendapatkan lokasi kegiatan untuk Satker tertentu
const getLokasiKegiatanBySkpd = async (req, res) => {
    try {
        const { id_satker } = req.params;
        const { tanggal } = req.query;
        
        const whereClause = { id_satker };
        if (tanggal) {
            whereClause['$MasterJadwalKegiatan.tanggal_kegiatan$'] = tanggal;
        }
        
        const lokasiList = await JadwalKegiatanLokasiSatker.findAll({
            where: whereClause,
            include: [
                {
                    model: MasterJadwalKegiatan,
                    attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan']
                },
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'lat', 'lng', 'ket', 'status']
                }
            ],
            order: [
                [{ model: MasterJadwalKegiatan }, 'tanggal_kegiatan', 'ASC']
            ]
        });
        
        res.status(200).json({
            success: true,
            data: lokasiList,
            total_lokasi: lokasiList.length
        });
    } catch (error) {
        console.error('Get Lokasi Kegiatan By SKPD Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Mendapatkan semua relasi jadwal kegiatan lokasi SKPD
const getAllJadwalKegiatanLokasiSatker = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const { count, rows: relasiList } = await JadwalKegiatanLokasiSatker.findAndCountAll({
            include: [
                {
                    model: MasterJadwalKegiatan,
                    attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan']
                },
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'lat', 'lng', 'ket', 'status']
                }
            ],
            order: [
                [{ model: MasterJadwalKegiatan }, 'tanggal_kegiatan', 'DESC']
            ],
            offset,
            limit
        });
        
        res.status(200).json({
            success: true,
            data: relasiList,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get All Jadwal Kegiatan Lokasi SKPD Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Mendapatkan lokasi kegiatan untuk user berdasarkan SKPD
const getLokasiKegiatanForUser = async (req, res) => {
    try {
        const userNip = req.user.username;
        const { tanggal } = req.query;
        
        // Dapatkan data pegawai
        const pegawai = await MstPegawai.findOne({
            where: { NIP: userNip }
        });
        
        if (!pegawai) {
            return res.status(404).json({
                success: false,
                error: 'Data pegawai tidak ditemukan'
            });
        }
        
        const whereClause = { id_satker: pegawai.KDSATKER };
        if (tanggal) {
            whereClause['$MasterJadwalKegiatan.tanggal_kegiatan$'] = tanggal;
        }
        
        const lokasiKegiatan = await JadwalKegiatanLokasiSatker.findOne({
            where: whereClause,
            include: [
                {
                    model: MasterJadwalKegiatan,
                    attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan']
                },
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'lat', 'lng', 'ket', 'status']
                }
            ],
            order: [
                [{ model: MasterJadwalKegiatan }, 'tanggal_kegiatan', 'ASC']
            ]
        });
        
        if (lokasiKegiatan) {
            res.status(200).json({
                success: true,
                data: [lokasiKegiatan.Lokasi],
                is_kegiatan: true,
                jadwal_kegiatan: lokasiKegiatan.MasterJadwalKegiatan,
                satker_info: {
                    id_satker: pegawai.KDSATKER,
                    nama_pegawai: pegawai.NAMA
                }
            });
        } else {
            res.status(200).json({
                success: true,
                data: [],
                is_kegiatan: false,
                jadwal_kegiatan: null,
                satker_info: {
                    id_satker: pegawai.KDSATKER,
                    nama_pegawai: pegawai.NAMA
                }
            });
        }
    } catch (error) {
        console.error('Get Lokasi Kegiatan For User Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    addSkpdToKegiatanLokasi,
    removeSkpdFromKegiatanLokasi,
    getSkpdByKegiatanLokasi,
    getLokasiKegiatanBySkpd,
    getAllJadwalKegiatanLokasiSatker,
    getLokasiKegiatanForUser
}; 