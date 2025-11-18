const { MasterJadwalKegiatan, Lokasi, JadwalKegiatanLokasiSatker, SatkerTbl, MstPegawai, KehadiranKegiatan, User, GrupPesertaKegiatan, PesertaGrupKegiatan } = require('../models');
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
        
        // Dapatkan data Satker dan NIP untuk setiap lokasi
        const lokasiWithSatker = [];
        if (jadwal.Lokasis && jadwal.Lokasis.length > 0) {
            for (const lokasi of jadwal.Lokasis) {
                const pesertaList = await JadwalKegiatanLokasiSatker.findAll({
                    where: {
                        id_kegiatan: id_kegiatan,
                        lokasi_id: lokasi.lokasi_id
                    },
                    attributes: ['id_satker', 'nip']
                });
                
                // Dapatkan unique satker dan NIP
                const satkerSet = new Set();
                const nipSet = new Set();
                
                pesertaList.forEach(p => {
                    if (p.id_satker) {
                        satkerSet.add(p.id_satker);
                    }
                    if (p.nip) {
                        nipSet.add(p.nip);
                    }
                });
                
                const satkerList = Array.from(satkerSet);
                const nipList = Array.from(nipSet);
                
                lokasiWithSatker.push({
                    ...lokasi.toJSON(),
                    satker_list: satkerList, // Unique satker yang terlibat
                    nip_list: nipList.length > 0 ? nipList : undefined // Unique NIP yang terlibat
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
                },
                {
                    model: User,
                    as: 'pegawai',
                    attributes: ['username', 'email'],
                    required: false
                }
            ],
            order: [['lokasi_id', 'ASC']]
        });
        
        // Group by lokasi_id untuk menghindari duplikasi
        const lokasiMap = new Map();
        // Map untuk tracking satker dan NIP per lokasi
        const satkerSetPerLokasi = new Map(); // Map<lokasiId, Set<id_satker>>
        const nipSetPerLokasi = new Map(); // Map<lokasiId, Set<nip>>
        
        lokasiKegiatan.forEach(item => {
            const lokasiId = item.Lokasi.lokasi_id;
            
            // Initialize lokasi map
            if (!lokasiMap.has(lokasiId)) {
                lokasiMap.set(lokasiId, {
                    lokasi_id: item.Lokasi.lokasi_id,
                    lat: item.Lokasi.lat,
                    lng: item.Lokasi.lng,
                    ket: item.Lokasi.ket,
                    status: item.Lokasi.status,
                    range: item.Lokasi.range,
                    satker_list: [],
                    nip_list: []
                });
                satkerSetPerLokasi.set(lokasiId, new Set());
                nipSetPerLokasi.set(lokasiId, new Set());
            }
            
            // Tambahkan id_satker ke set (untuk mendapatkan unique satker)
            // Abaikan entry dummy dengan id_satker = 'NO_SATKER'
            if (item.id_satker && item.id_satker !== 'NO_SATKER') {
                satkerSetPerLokasi.get(lokasiId).add(item.id_satker);
            }
            
            // Tambahkan NIP ke set jika ada
            if (item.nip) {
                nipSetPerLokasi.get(lokasiId).add(item.nip);
            }
        });
        
        // Convert Set to Array untuk setiap lokasi
        lokasiMap.forEach((lokasi, lokasiId) => {
            lokasi.satker_list = Array.from(satkerSetPerLokasi.get(lokasiId) || []);
            lokasi.nip_list = Array.from(nipSetPerLokasi.get(lokasiId) || []);
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
        const { lokasi_id, kdsatker_list, nip_list } = req.body; // Support kdsatker_list (backward compatible) dan nip_list (peserta individu)
        
        // Validasi input
        if (!lokasi_id) {
            return res.status(400).json({
                success: false,
                error: 'lokasi_id harus diisi'
            });
        }
        
        // Untuk flow baru dengan grup peserta, lokasi bisa ditambahkan tanpa peserta
        // Peserta akan ditambahkan melalui grup peserta setelah lokasi dibuat
        // Jika kdsatker_list dan nip_list tidak ada atau kosong, hanya tambahkan lokasi saja
        
        if (kdsatker_list && !Array.isArray(kdsatker_list)) {
            return res.status(400).json({
                success: false,
                error: 'kdsatker_list harus berupa array'
            });
        }
        
        if (nip_list && !Array.isArray(nip_list)) {
            return res.status(400).json({
                success: false,
                error: 'nip_list harus berupa array'
            });
        }
        
        // Normalize: jika undefined, set sebagai array kosong
        const normalizedKdsatkerList = kdsatker_list || [];
        const normalizedNipList = nip_list || [];
        
        // Convert to proper types
        const kegiatanId = parseInt(id_kegiatan);
        const lokasiId = parseInt(lokasi_id);
        
        console.log('Input values:', {
            id_kegiatan: kegiatanId,
            lokasi_id: lokasiId,
            kdsatker_list: normalizedKdsatkerList,
            nip_list: normalizedNipList
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
        
        // Cek apakah lokasi sudah ada untuk kegiatan ini
        const existingLokasiRelasi = await JadwalKegiatanLokasiSatker.findOne({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId },
            attributes: ['id']
        });
        
        if (existingLokasiRelasi && normalizedKdsatkerList.length === 0 && normalizedNipList.length === 0) {
            // Jika lokasi sudah ada dan tidak ada peserta yang ditambahkan, return success
            return res.status(200).json({
                success: true,
                message: 'Lokasi sudah ada untuk kegiatan ini',
                data: {
                    id_kegiatan: kegiatanId,
                    lokasi_id: lokasiId,
                    lokasi_info: {
                        lokasi_id: lokasi.lokasi_id,
                        ket: lokasi.ket,
                        lat: lokasi.lat,
                        lng: lokasi.lng
                    },
                    peserta_added: 0,
                    note: 'Lokasi sudah ada. Silakan buat grup peserta untuk menambahkan peserta.'
                }
            });
        }
        
        // Jika tidak ada peserta yang ditambahkan (array kosong), buat entry minimal
        // di jadwal_kegiatan_lokasi_satker agar lokasi muncul di daftar lokasi
        // Entry ini akan dihapus atau diganti saat grup peserta dibuat
        if (normalizedKdsatkerList.length === 0 && normalizedNipList.length === 0) {
            // Cek apakah sudah ada entry untuk lokasi ini (termasuk entry dummy)
            const existingEntry = await JadwalKegiatanLokasiSatker.findOne({
                where: { 
                    id_kegiatan: kegiatanId, 
                    lokasi_id: lokasiId 
                }
            });
            
            // Jika belum ada entry, buat entry minimal dengan id_satker dummy
            // 'NO_SATKER' digunakan sebagai penanda bahwa lokasi belum punya peserta
            if (!existingEntry) {
                await JadwalKegiatanLokasiSatker.create({
                    id_kegiatan: kegiatanId,
                    lokasi_id: lokasiId,
                    id_satker: 'NO_SATKER', // Dummy value untuk menandai lokasi tanpa peserta
                    nip: null
                });
            }
            
            return res.status(201).json({
                success: true,
                message: 'Lokasi berhasil ditambahkan. Silakan buat grup peserta untuk menambahkan peserta.',
                data: {
                    id_kegiatan: kegiatanId,
                    lokasi_id: lokasiId,
                    lokasi_info: {
                        lokasi_id: lokasi.lokasi_id,
                        ket: lokasi.ket,
                        lat: lokasi.lat,
                        lng: lokasi.lng
                    },
                    peserta_added: 0,
                    note: 'Lokasi ditambahkan tanpa peserta. Buat grup peserta untuk menambahkan peserta.'
                }
            });
        }
        
        // Debug: tampilkan Satker yang sudah ada untuk lokasi ini
        const currentSatker = await JadwalKegiatanLokasiSatker.findAll({
            where: { id_kegiatan: kegiatanId, lokasi_id: lokasiId },
            attributes: ['id_satker', 'nip']
        });
        console.log('Current Satker/NIP for this location:', currentSatker.map(s => ({ id_satker: s.id_satker, nip: s.nip })));
        
        // Tambahkan Satker atau NIP ke lokasi kegiatan
        const relasiList = [];
        const existingSatker = [];
        const existingNip = [];
        const failedNip = [];
        
        // Proses kdsatker_list (backward compatible)
        // Ketika menambahkan Satker, otomatis tambahkan semua pegawai aktif di Satker tersebut
        if (normalizedKdsatkerList.length > 0) {
            for (const kdsatker of normalizedKdsatkerList) {
                try {
                    console.log(`Processing Satker: ${kdsatker}`);
                    
                    // Dapatkan semua pegawai aktif di Satker ini
                    const pegawaiSatker = await MstPegawai.findAll({
                        where: {
                            KDSATKER: kdsatker,
                            STATUSAKTIF: 'AKTIF'
                        },
                        attributes: ['NIP', 'KDSATKER']
                    });
                    
                    if (pegawaiSatker.length === 0) {
                        console.log(`Satker ${kdsatker} tidak memiliki pegawai aktif`);
                        failedNip.push({ nip: kdsatker, reason: 'Satker tidak memiliki pegawai aktif' });
                        continue;
                    }
                    
                    console.log(`Found ${pegawaiSatker.length} active employees in Satker ${kdsatker}`);
                    
                    // Tambahkan setiap pegawai dari Satker ini
                    let addedCount = 0;
                    let skippedCount = 0;
                    
                    for (const pegawai of pegawaiSatker) {
                        try {
                            // Cek apakah kombinasi id_kegiatan, lokasi_id, id_satker, dan nip sudah ada
                            const existingRelasi = await JadwalKegiatanLokasiSatker.findOne({
                                where: { 
                                    id_kegiatan: kegiatanId, 
                                    lokasi_id: lokasiId, 
                                    id_satker: kdsatker,
                                    nip: pegawai.NIP
                                }
                            });
                            
                            if (existingRelasi) {
                                skippedCount++;
                                console.log(`Pegawai ${pegawai.NIP} dari Satker ${kdsatker} sudah ada untuk lokasi ini`);
                                continue;
                            }
                            
                            console.log(`Creating new relation for NIP: ${pegawai.NIP} (Satker: ${kdsatker})`);
                            const relasi = await JadwalKegiatanLokasiSatker.create({
                                id_kegiatan: kegiatanId,
                                lokasi_id: lokasiId,
                                id_satker: kdsatker,
                                nip: pegawai.NIP
                            });
                            relasiList.push(relasi);
                            addedCount++;
                            console.log(`Pegawai ${pegawai.NIP} berhasil ditambahkan dengan ID: ${relasi.id}`);
                        } catch (error) {
                            // Jika ada error (misal duplikasi), skip
                            console.log(`Pegawai ${pegawai.NIP} error:`, error.message);
                            skippedCount++;
                        }
                    }
                    
                    if (addedCount === 0 && skippedCount === pegawaiSatker.length) {
                        existingSatker.push(kdsatker);
                        console.log(`Semua pegawai dari Satker ${kdsatker} sudah ada untuk lokasi ini`);
                    } else {
                        console.log(`Satker ${kdsatker}: ${addedCount} pegawai ditambahkan, ${skippedCount} sudah ada`);
                    }
                } catch (error) {
                    // Jika ada error (misal Satker tidak ditemukan), skip
                    console.log(`Satker ${kdsatker} error:`, error.message);
                    console.log('Full error:', error);
                    failedNip.push({ nip: kdsatker, reason: error.message });
                }
            }
        }
        
        // Proses nip_list (peserta individu)
        if (normalizedNipList.length > 0) {
            // Dapatkan data pegawai untuk mendapatkan id_satker mereka
            const pegawaiList = await MstPegawai.findAll({
                where: {
                    NIP: { [Op.in]: normalizedNipList },
                    STATUSAKTIF: 'AKTIF'
                },
                attributes: ['NIP', 'KDSATKER']
            });
            
            const nipToSatkerMap = {};
            pegawaiList.forEach(p => {
                nipToSatkerMap[p.NIP] = p.KDSATKER;
            });
            
            for (const nip of normalizedNipList) {
                try {
                    console.log(`Processing NIP: ${nip}`);
                    
                    // Cek apakah NIP valid (ada di database pegawai)
                    if (!nipToSatkerMap[nip]) {
                        failedNip.push({ nip, reason: 'NIP tidak ditemukan atau pegawai tidak aktif' });
                        console.log(`NIP ${nip} tidak ditemukan atau tidak aktif`);
                        continue;
                    }
                    
                    const id_satker = nipToSatkerMap[nip];
                    
                    // Cek apakah kombinasi id_kegiatan, lokasi_id, id_satker, dan nip sudah ada
                    const existingRelasi = await JadwalKegiatanLokasiSatker.findOne({
                        where: { 
                            id_kegiatan: kegiatanId, 
                            lokasi_id: lokasiId, 
                            id_satker: id_satker,
                            nip: nip
                        }
                    });
                    
                    if (existingRelasi) {
                        existingNip.push(nip);
                        console.log(`NIP ${nip} sudah ada untuk lokasi ini`);
                        continue;
                    }
                    
                    console.log(`Creating new relation for NIP: ${nip} (Satker: ${id_satker})`);
                    const relasi = await JadwalKegiatanLokasiSatker.create({
                        id_kegiatan: kegiatanId,
                        lokasi_id: lokasiId,
                        id_satker: id_satker,
                        nip: nip
                    });
                    relasiList.push(relasi);
                    console.log(`NIP ${nip} berhasil ditambahkan dengan ID: ${relasi.id}`);
                } catch (error) {
                    // Jika ada error (misal duplikasi), skip
                    console.log(`NIP ${nip} error:`, error.message);
                    console.log('Full error:', error);
                    failedNip.push({ nip, reason: error.message });
                }
            }
        }
        
        const totalRequested = (kdsatker_list?.length || 0) + (nip_list?.length || 0);
        const totalSuccess = relasiList.length;
        const totalExisting = existingSatker.length + existingNip.length;
        const totalFailed = failedNip.length;
        
        // Hitung jumlah NIP yang ditambahkan dari Satker vs NIP langsung
        const nipFromSatker = kdsatker_list ? relasiList.filter(r => r.nip && kdsatker_list.includes(r.id_satker)).length : 0;
        const nipFromDirect = nip_list ? relasiList.filter(r => r.nip && nip_list.includes(r.nip)).length : 0;
        
        res.status(201).json({
            success: true,
            message: totalSuccess > 0 
                ? `Lokasi berhasil ditambahkan. ${totalSuccess} peserta ditambahkan (${nipFromSatker} dari Satker, ${nipFromDirect} langsung)` 
                : totalExisting > 0 
                    ? 'Semua peserta sudah ada untuk lokasi ini'
                    : 'Tidak ada peserta yang berhasil ditambahkan',
            data: {
                id_kegiatan: kegiatanId,
                lokasi_id: lokasiId,
                lokasi_info: {
                    lokasi_id: lokasi.lokasi_id,
                    ket: lokasi.ket,
                    lat: lokasi.lat,
                    lng: lokasi.lng
                },
                peserta_added: totalSuccess,
                satker_processed: kdsatker_list?.length || 0,
                nip_from_satker: nipFromSatker,
                nip_from_direct: nipFromDirect,
                nip_list: relasiList.filter(r => r.nip).map(r => r.nip),
                existing_satker: existingSatker.length > 0 ? existingSatker : undefined,
                existing_nip: existingNip.length > 0 ? existingNip : undefined,
                failed_nip: failedNip.length > 0 ? failedNip : undefined,
                total_requested: totalRequested,
                summary: {
                    success: totalSuccess,
                    already_exists: totalExisting,
                    failed: totalFailed,
                    total: totalRequested,
                    from_satker: nipFromSatker,
                    from_direct: nipFromDirect
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
        const { kdsatker_list, nip_list } = req.body; // Support kdsatker_list dan nip_list
        
        // Validasi input - kdsatker_list dan nip_list harus berupa array (boleh kosong untuk menghapus semua)
        // Jika keduanya tidak ada atau undefined, berarti tidak ada perubahan
        if (kdsatker_list === undefined && nip_list === undefined) {
            return res.status(400).json({
                success: false,
                error: 'kdsatker_list atau nip_list (array) harus diisi. Gunakan array kosong [] untuk menghapus semua.'
            });
        }
        
        if (kdsatker_list !== undefined && !Array.isArray(kdsatker_list)) {
            return res.status(400).json({
                success: false,
                error: 'kdsatker_list harus berupa array'
            });
        }
        
        if (nip_list !== undefined && !Array.isArray(nip_list)) {
            return res.status(400).json({
                success: false,
                error: 'nip_list harus berupa array'
            });
        }
        
        // Normalize: jika undefined, set sebagai array kosong untuk perbandingan
        // Tapi kita perlu tahu apakah user benar-benar mengirim array atau tidak
        // Jika undefined, berarti user tidak mengubah field tersebut
        // Jika array kosong [], berarti user ingin menghapus semua
        // PENTING: Gunakan flag isKdsatkerListExplicit dan isNipListExplicit untuk membedakan
        const normalizedKdsatkerList = kdsatker_list !== undefined ? kdsatker_list : [];
        const normalizedNipList = nip_list !== undefined ? nip_list : [];
        
        // Flag untuk mengetahui apakah user mengirim nip_list secara eksplisit
        const isNipListExplicit = nip_list !== undefined;
        // Flag untuk mengetahui apakah user mengirim kdsatker_list secara eksplisit
        const isKdsatkerListExplicit = kdsatker_list !== undefined;
        
        // Jika kedua array kosong, berarti user ingin menghapus semua peserta
        if (normalizedKdsatkerList.length === 0 && normalizedNipList.length === 0) {
            console.log('Both arrays are empty - will remove all participants');
        }
        
        const kegiatanId = parseInt(id_kegiatan);
        const lokasiId = parseInt(lokasi_id);
        
        console.log('Edit Satker - Input values:', {
            id_kegiatan: kegiatanId,
            lokasi_id: lokasiId,
            kdsatker_list: normalizedKdsatkerList,
            nip_list: normalizedNipList
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
        
        // Dapatkan unique satker dan NIP yang sudah ada
        const currentSatkerSet = new Set();
        const currentNipSet = new Set();
        currentSatker.forEach(s => {
            if (s.id_satker) currentSatkerSet.add(s.id_satker);
            if (s.nip) currentNipSet.add(s.nip);
        });
        
        const currentSatkerList = Array.from(currentSatkerSet);
        const currentNipList = Array.from(currentNipSet);
        
        console.log('=== EDIT SKPD KEGIATAN LOKASI DEBUG ===');
        console.log('Current Satker (unique):', currentSatkerList);
        console.log('Current NIP (unique):', currentNipList);
        console.log('New Satker from body:', normalizedKdsatkerList);
        console.log('New NIP from body:', normalizedNipList);
        console.log('Total current relations:', currentSatker.length);
        console.log('isNipListExplicit:', isNipListExplicit);
        console.log('isKdsatkerListExplicit:', isKdsatkerListExplicit);
        console.log('Current Satker relations (first 5):', currentSatker.slice(0, 5).map(s => ({ id_satker: s.id_satker, nip: s.nip })));
        
        // Identifikasi Satker yang akan dihapus (ada di current tapi TIDAK ada di body)
        // TAPI, hanya hapus jika user secara eksplisit mengirim kdsatker_list
        // Jika user tidak mengirim kdsatker_list, berarti user tidak mengubah Satker, jadi jangan hapus
        let satkerToRemove;
        if (isKdsatkerListExplicit) {
            satkerToRemove = currentSatkerList.filter(s => !normalizedKdsatkerList.includes(s));
            console.log('User mengirim kdsatker_list secara eksplisit, satkerToRemove:', satkerToRemove);
        } else {
            satkerToRemove = []; // Jika user tidak mengirim kdsatker_list, jangan hapus Satker yang sudah ada
            console.log('User TIDAK mengirim kdsatker_list, jangan hapus Satker. satkerToRemove:', satkerToRemove);
        }
        
        // Identifikasi NIP yang akan dihapus (ada di current tapi TIDAK ada di body)
        // Logika:
        // 1. Jika NIP ada di normalizedNipList, berarti masih dipilih sebagai NIP individu, jangan hapus
        // 2. Jika NIP tidak ada di normalizedNipList:
        //    - Jika user mengirim nip_list secara eksplisit (isNipListExplicit = true):
        //      * Hapus NIP tersebut (karena user secara eksplisit menghapusnya dari nip_list)
        //      * KECUALI jika NIP tersebut berasal dari Satker yang masih terpilih (di normalizedKdsatkerList)
        //        dan user tidak mengubah Satker (normalizedKdsatkerList kosong atau sama dengan current)
        //    - Jika user tidak mengirim nip_list (isNipListExplicit = false):
        //      * Hapus jika Satker-nya tidak ada di normalizedKdsatkerList
        const satkerToKeep = new Set(normalizedKdsatkerList);
        
        const nipToRemove = currentNipList.filter(n => {
            // Jika NIP ada di normalizedNipList, berarti masih dipilih sebagai NIP individu, jangan hapus
            if (normalizedNipList.includes(n)) {
                return false;
            }
            
            // Cari data NIP di currentSatker untuk mendapatkan id_satker-nya
            const nipData = currentSatker.find(s => s.nip === n);
            if (!nipData) {
                // Jika tidak ada data, hapus saja (edge case)
                console.log(`NIP ${n} tidak ditemukan di currentSatker, akan dihapus`);
                return true;
            }
            
            const nipSatker = nipData.id_satker; // id_satker = kdsatker
            
            // Jika user mengirim nip_list secara eksplisit, berarti user mengatur NIP individu secara eksplisit
            // Jika NIP tidak ada di normalizedNipList, berarti user menghapusnya secara eksplisit
            // Hapus NIP tersebut, KECUALI jika:
            // - User juga mengirim kdsatker_list (mengubah Satker) pada request yang sama
            // - DAN NIP tersebut berasal dari Satker yang baru ditambahkan (di normalizedKdsatkerList tapi tidak di currentSatkerList)
            //   (karena NIP tersebut akan ditambahkan melalui Satker baru)
            if (isNipListExplicit) {
                // Jika user mengirim nip_list secara eksplisit, berarti user mengatur NIP individu secara eksplisit
                // Jika NIP tidak ada di normalizedNipList, berarti user menghapusnya secara eksplisit
                // Hapus NIP tersebut, bahkan jika berasal dari Satker yang masih terpilih
                // (karena user secara eksplisit menghapusnya dari nip_list, berarti user tidak ingin NIP tersebut sebagai peserta individu)
                if (!isKdsatkerListExplicit) {
                    // User tidak mengubah Satker, tapi mengubah NIP individu
                    // Jika NIP tidak ada di normalizedNipList, berarti user menghapusnya secara eksplisit
                    // Hapus NIP tersebut, bahkan jika berasal dari Satker yang masih terpilih
                    // (karena user secara eksplisit menghapusnya dari nip_list)
                    console.log(`NIP ${n} (Satker: ${nipSatker}) akan dihapus karena tidak ada di normalizedNipList (user menghapusnya secara eksplisit)`);
                    return true; // Hapus karena user secara eksplisit menghapusnya dari nip_list
                }
                
                // Jika user mengirim keduanya (nip_list dan kdsatker_list), berarti user mengatur keduanya secara eksplisit
                // Jika NIP tidak ada di normalizedNipList, hapus saja (user secara eksplisit menghapusnya)
                // TAPI, jika NIP berasal dari Satker yang baru ditambahkan (di normalizedKdsatkerList tapi tidak di currentSatkerList),
                // jangan hapus karena NIP tersebut akan ditambahkan melalui Satker
                if (isKdsatkerListExplicit) {
                    // Cek apakah Satker ini baru ditambahkan (ada di normalizedKdsatkerList tapi tidak di currentSatkerList)
                    const isNewSatker = !currentSatkerList.includes(nipSatker) && satkerToKeep.has(nipSatker);
                    if (isNewSatker) {
                        return false; // Jangan hapus karena akan ditambahkan melalui Satker baru
                    }
                    // Jika Satker sudah ada sebelumnya, dan NIP tidak ada di normalizedNipList, hapus
                    // (karena user secara eksplisit menghapusnya dari nip_list)
                    return true;
                }
            }
            
            // Jika user tidak mengirim nip_list, berarti user tidak mengubah NIP individu
            // Hapus jika Satker-nya tidak ada di normalizedKdsatkerList
            // Tapi jika user tidak mengirim kdsatker_list, berarti Satker tidak berubah
            // Jadi jangan hapus NIP yang berasal dari Satker yang masih terpilih
            if (!isKdsatkerListExplicit) {
                // User tidak mengirim kdsatker_list, berarti Satker tidak berubah
                // Jadi semua Satker di currentSatkerList masih terpilih
                const satkerStillSelected = new Set(currentSatkerList);
                // Jangan hapus NIP yang berasal dari Satker yang masih terpilih
                return !satkerStillSelected.has(nipSatker);
            }
            
            // User mengirim kdsatker_list, hapus jika Satker-nya tidak ada di normalizedKdsatkerList
            return !satkerToKeep.has(nipSatker);
        });
        
        // Identifikasi Satker yang akan ditambahkan (ada di body tapi tidak di current)
        const satkerToAdd = normalizedKdsatkerList.filter(s => !currentSatkerList.includes(s));
        
        // Identifikasi NIP yang akan ditambahkan (ada di body tapi tidak di current)
        const nipToAdd = normalizedNipList.filter(n => !currentNipList.includes(n));
        
        console.log('=== CHANGES SUMMARY ===');
        console.log('Satker to REMOVE (unchecked):', satkerToRemove);
        console.log('NIP to REMOVE (unchecked):', nipToRemove);
        console.log('Satker to ADD (newly checked):', satkerToAdd);
        console.log('NIP to ADD (newly checked):', nipToAdd);
        
        // Gunakan transaction untuk memastikan operasi atomic
        const sequelize = JadwalKegiatanLokasiSatker.sequelize;
        const transaction = await sequelize.transaction();
        
        try {
            // Hapus relasi untuk Satker yang di-unchecklist
            // Hapus semua pegawai dari Satker yang tidak ada di body
            let deletedCount = 0;
            if (satkerToRemove.length > 0) {
                console.log(`Deleting relations for ${satkerToRemove.length} unchecked Satker...`);
                const deletedForSatker = await JadwalKegiatanLokasiSatker.destroy({
                    where: { 
                        id_kegiatan: kegiatanId, 
                        lokasi_id: lokasiId,
                        id_satker: { [Op.in]: satkerToRemove }
                    },
                    transaction
                });
                deletedCount += deletedForSatker;
                console.log(`Deleted ${deletedForSatker} relations for unchecked Satker`);
            }
            
            // Hapus NIP individu yang di-unchecklist (yang tidak termasuk dalam Satker yang masih terpilih)
            if (nipToRemove.length > 0) {
                console.log(`Deleting ${nipToRemove.length} unchecked NIP...`);
                const deletedForNip = await JadwalKegiatanLokasiSatker.destroy({
                    where: { 
                        id_kegiatan: kegiatanId, 
                        lokasi_id: lokasiId,
                        nip: { [Op.in]: nipToRemove }
                    },
                    transaction
                });
                deletedCount += deletedForNip;
                console.log(`Deleted ${deletedForNip} relations for unchecked NIP`);
            }
            
            console.log(`Total deleted relations: ${deletedCount}`);
            
            // Verifikasi: Pastikan tidak ada relasi untuk Satker yang dihapus
            if (satkerToRemove.length > 0) {
                const remainingForRemovedSatker = await JadwalKegiatanLokasiSatker.count({
                    where: { 
                        id_kegiatan: kegiatanId, 
                        lokasi_id: lokasiId,
                        id_satker: { [Op.in]: satkerToRemove }
                    },
                    transaction
                });
                
                if (remainingForRemovedSatker > 0) {
                    console.log(`Warning: Masih ada ${remainingForRemovedSatker} relasi untuk Satker yang seharusnya dihapus. Mencoba hapus lagi...`);
                    await JadwalKegiatanLokasiSatker.destroy({
                        where: { 
                            id_kegiatan: kegiatanId, 
                            lokasi_id: lokasiId,
                            id_satker: { [Op.in]: satkerToRemove }
                        },
                        transaction
                    });
                }
            }
            
            console.log('Verification: All unchecked Satker/NIP deleted');
        
            // Tambahkan peserta baru (Satker atau NIP)
            const newRelations = [];
            const failedSatker = [];
            const failedNip = [];
            
            // Proses kdsatker_list (otomatis tambahkan semua pegawai dari Satker)
            // Hanya tambahkan Satker yang baru (belum ada sebelumnya)
            // TAPI, jika user mengirim nip_list secara eksplisit, jangan tambahkan NIP yang sudah dihapus dari nip_list
            // (karena user secara eksplisit menghapusnya, jadi jangan tambahkan kembali melalui Satker)
            const nipExplicitlyRemoved = isNipListExplicit ? new Set(nipToRemove) : new Set();
            
            // Juga, jika user hanya mengirim nip_list (tidak mengubah Satker), 
            // jangan tambahkan NIP yang dihapus dari nip_list saat menambahkan Satker yang sudah ada
            // (karena Satker yang sudah ada tidak akan ditambahkan lagi, hanya yang baru)
            
            if (satkerToAdd.length > 0) {
                console.log(`Adding ${satkerToAdd.length} new Satker...`);
                for (const kdsatker of satkerToAdd) {
                    try {
                        console.log(`Processing new Satker: ${kdsatker}`);
                        
                        // Dapatkan semua pegawai aktif di Satker ini
                        const pegawaiSatker = await MstPegawai.findAll({
                            where: {
                                KDSATKER: kdsatker,
                                STATUSAKTIF: 'AKTIF'
                            },
                            attributes: ['NIP', 'KDSATKER']
                        });
                        
                        if (pegawaiSatker.length === 0) {
                            console.log(`Satker ${kdsatker} tidak memiliki pegawai aktif`);
                            failedSatker.push({ satker: kdsatker, reason: 'Satker tidak memiliki pegawai aktif' });
                            continue;
                        }
                        
                        console.log(`Found ${pegawaiSatker.length} active employees in Satker ${kdsatker}`);
                        
                        // Tambahkan setiap pegawai dari Satker ini
                        for (const pegawai of pegawaiSatker) {
                            try {
                                // Jika user mengirim nip_list secara eksplisit dan NIP ini dihapus dari nip_list,
                                // jangan tambahkan (karena user secara eksplisit menghapusnya)
                                if (nipExplicitlyRemoved.has(pegawai.NIP)) {
                                    console.log(`Pegawai ${pegawai.NIP} dari Satker ${kdsatker} dihapus dari nip_list, skip`);
                                    continue;
                                }
                                
                                // Cek dulu apakah sudah ada (untuk menghindari duplicate)
                                const existing = await JadwalKegiatanLokasiSatker.findOne({
                                    where: {
                                        id_kegiatan: kegiatanId,
                                        lokasi_id: lokasiId,
                                        id_satker: kdsatker,
                                        nip: pegawai.NIP
                                    },
                                    transaction
                                });
                                
                                if (existing) {
                                    console.log(`Pegawai ${pegawai.NIP} dari Satker ${kdsatker} sudah ada, skip`);
                                    newRelations.push(existing);
                                    continue;
                                }
                                
                                console.log(`Creating relation for NIP: ${pegawai.NIP} (Satker: ${kdsatker})`);
                                const relasi = await JadwalKegiatanLokasiSatker.create({
                                    id_kegiatan: kegiatanId,
                                    lokasi_id: lokasiId,
                                    id_satker: kdsatker,
                                    nip: pegawai.NIP
                                }, { transaction });
                                newRelations.push(relasi);
                                console.log(`Pegawai ${pegawai.NIP} berhasil ditambahkan dengan ID: ${relasi.id}`);
                            } catch (error) {
                                console.log(`Pegawai ${pegawai.NIP} error:`, error.message);
                                console.log('Full error:', error);
                                // Jika error adalah validation error (duplicate), skip saja
                                if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
                                    console.log(`Pegawai ${pegawai.NIP} sudah ada atau ada constraint violation, skip`);
                                    failedNip.push({ nip: pegawai.NIP, reason: 'Data sudah ada atau constraint violation' });
                                } else {
                                    // Untuk error lain, throw untuk rollback transaction
                                    throw error;
                                }
                            }
                        }
                    } catch (error) {
                        console.log(`Satker ${kdsatker} error:`, error.message);
                        failedSatker.push({ satker: kdsatker, reason: error.message });
                    }
                }
            } else {
                console.log('No new Satker to add (all Satker already exist)');
            }
            
            // Proses nip_list (peserta individu)
            // Hanya tambahkan NIP yang baru (belum ada sebelumnya)
            if (nipToAdd.length > 0) {
                console.log(`Adding ${nipToAdd.length} new NIP...`);
                // Dapatkan data pegawai untuk mendapatkan id_satker mereka
                const pegawaiList = await MstPegawai.findAll({
                    where: {
                        NIP: { [Op.in]: nipToAdd },
                        STATUSAKTIF: 'AKTIF'
                    },
                    attributes: ['NIP', 'KDSATKER']
                });
                
                const nipToSatkerMap = {};
                pegawaiList.forEach(p => {
                    nipToSatkerMap[p.NIP] = p.KDSATKER;
                });
                
                for (const nip of nipToAdd) {
                try {
                    console.log(`Processing NIP: ${nip}`);
                    
                    // Cek apakah NIP valid (ada di database pegawai)
                    if (!nipToSatkerMap[nip]) {
                        failedNip.push({ nip, reason: 'NIP tidak ditemukan atau pegawai tidak aktif' });
                        console.log(`NIP ${nip} tidak ditemukan atau tidak aktif`);
                        continue;
                    }
                    
                    const id_satker = nipToSatkerMap[nip];
                    
                    // Cek dulu apakah sudah ada (untuk menghindari duplicate)
                    const existing = await JadwalKegiatanLokasiSatker.findOne({
                        where: {
                            id_kegiatan: kegiatanId,
                            lokasi_id: lokasiId,
                            id_satker: id_satker,
                            nip: nip
                        },
                        transaction
                    });
                    
                    if (existing) {
                        console.log(`NIP ${nip} sudah ada, skip`);
                        newRelations.push(existing);
                        continue;
                    }
                    
                    console.log(`Creating relation for NIP: ${nip} (Satker: ${id_satker})`);
                    const relasi = await JadwalKegiatanLokasiSatker.create({
                        id_kegiatan: kegiatanId,
                        lokasi_id: lokasiId,
                        id_satker: id_satker,
                        nip: nip
                    }, { transaction });
                    newRelations.push(relasi);
                    console.log(`NIP ${nip} berhasil ditambahkan dengan ID: ${relasi.id}`);
                } catch (error) {
                    console.log(`NIP ${nip} error:`, error.message);
                    console.log('Full error:', error);
                    // Jika error adalah validation error (duplicate), skip saja
                    if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
                        console.log(`NIP ${nip} sudah ada atau ada constraint violation, skip`);
                        failedNip.push({ nip, reason: 'Data sudah ada atau constraint violation' });
                    } else {
                        // Untuk error lain, throw untuk rollback transaction
                        throw error;
                    }
                }
            }
            } else {
                console.log('No new NIP to add (all NIP already exist)');
            }
        
            // Commit transaction jika semua berhasil
            await transaction.commit();
            console.log('Transaction committed successfully');
            
            // Hitung statistik
            const nipFromSatker = normalizedKdsatkerList.length > 0 ? newRelations.filter(r => r.nip && normalizedKdsatkerList.includes(r.id_satker)).length : 0;
            const nipFromDirect = normalizedNipList.length > 0 ? newRelations.filter(r => r.nip && normalizedNipList.includes(r.nip)).length : 0;
            
            res.status(200).json({
            success: true,
            message: 'Daftar peserta berhasil diupdate',
            data: {
                id_kegiatan: kegiatanId,
                lokasi_id: lokasiId,
                lokasi_info: {
                    lokasi_id: lokasi.lokasi_id,
                    ket: lokasi.ket,
                    lat: lokasi.lat,
                    lng: lokasi.lng
                },
                previous_count: currentSatker.length,
                peserta_added: newRelations.length,
                satker_processed: normalizedKdsatkerList.length,
                nip_from_satker: nipFromSatker,
                nip_from_direct: nipFromDirect,
                nip_list: newRelations.filter(r => r.nip).map(r => r.nip),
                changes: {
                    satker_removed: satkerToRemove.length > 0 ? satkerToRemove : undefined,
                    satker_added: satkerToAdd.length > 0 ? satkerToAdd : undefined,
                    nip_removed: nipToRemove.length > 0 ? nipToRemove : undefined,
                    nip_added: nipToAdd.length > 0 ? nipToAdd : undefined
                },
                failed_satker: failedSatker.length > 0 ? failedSatker : undefined,
                failed_nip: failedNip.length > 0 ? failedNip : undefined,
                summary: {
                    previous_count: currentSatker.length,
                    deleted_count: deletedCount,
                    new_count: newRelations.length,
                    failed_satker_count: failedSatker.length,
                    failed_nip_count: failedNip.length,
                    total_requested: normalizedKdsatkerList.length + normalizedNipList.length,
                    from_satker: nipFromSatker,
                    from_direct: nipFromDirect,
                    satker_removed_count: satkerToRemove.length,
                    satker_added_count: satkerToAdd.length,
                    nip_removed_count: nipToRemove.length,
                    nip_added_count: nipToAdd.length
                }
            }
        });
        } catch (error) {
            // Rollback transaction jika ada error
            await transaction.rollback();
            console.error('Edit Satker Kegiatan Lokasi Error:', error);
            throw error;
        }
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
        // Abaikan entry dummy dengan id_satker = 'NO_SATKER'
        const lokasiSatkerList = await JadwalKegiatanLokasiSatker.findAll({
            where: { 
                id_kegiatan,
                id_satker: { [Op.ne]: 'NO_SATKER' } // Abaikan entry dummy
            },
            include: [
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'ket']
                }
            ],
            order: [['id', 'ASC']]
        });

        // Dapatkan semua id_satker yang terlibat (abaikan 'NO_SATKER')
        const satkerIds = [...new Set(lokasiSatkerList.map(relasi => relasi.id_satker).filter(id => id !== 'NO_SATKER'))];
        
        // Dapatkan data satker
        const satkerData = await SatkerTbl.findAll({
            where: {
                KDSATKER: {
                    [Op.in]: satkerIds
                }
            },
            attributes: ['KDSATKER', 'NMSATKER']
        });

        // Hitung total pegawai untuk setiap satker berdasarkan data dari jadwal_kegiatan_lokasi_satker
        // Ambil semua NIP yang terdaftar untuk setiap satker
        const pesertaPerSatker = {};
        lokasiSatkerList.forEach(relasi => {
            if (relasi.nip) { // Hanya hitung yang punya NIP (peserta individu)
                const id_satker = relasi.id_satker;
                if (!pesertaPerSatker[id_satker]) {
                    pesertaPerSatker[id_satker] = new Set();
                }
                pesertaPerSatker[id_satker].add(relasi.nip);
            }
        });
        
        // Convert Set to count
        const pegawaiCounts = Object.keys(pesertaPerSatker).map(kdsatker => ({
            KDSATKER: kdsatker,
            total_pegawai: pesertaPerSatker[kdsatker].size
        }));

        // Dapatkan semua NIP yang terdaftar sebagai peserta untuk setiap satker
        const nipPesertaPerSatker = {};
        lokasiSatkerList.forEach(relasi => {
            if (relasi.nip) { // Hanya yang punya NIP (peserta individu)
                const id_satker = relasi.id_satker;
                if (!nipPesertaPerSatker[id_satker]) {
                    nipPesertaPerSatker[id_satker] = new Set();
                }
                nipPesertaPerSatker[id_satker].add(relasi.nip);
            }
        });

        // Dapatkan semua NIP peserta yang terdaftar
        const allNipPeserta = new Set();
        Object.values(nipPesertaPerSatker).forEach(nipSet => {
            nipSet.forEach(nip => allNipPeserta.add(nip));
        });
        const nipPesertaArray = Array.from(allNipPeserta);

        // Dapatkan count kehadiran kegiatan untuk setiap satker
        // Hanya ambil kehadiran dari peserta yang terdaftar
        const kehadiranData = await KehadiranKegiatan.findAll({
            where: {
                id_kegiatan: id_kegiatan,
                absen_nip: { [Op.in]: nipPesertaArray }
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
                STATUSAKTIF: 'AKTIF'  // Filter hanya pegawai aktif
            },
            attributes: ['NIP', 'KDSATKER']
        });

        // Hitung kehadiran per satker (hanya dari peserta yang terdaftar)
        const kehadiranPerSatker = {};
        pegawaiYangHadir.forEach(pegawai => {
            const satker = pegawai.KDSATKER;
            // Pastikan NIP ini terdaftar sebagai peserta di satker ini
            if (nipPesertaPerSatker[satker] && nipPesertaPerSatker[satker].has(pegawai.NIP)) {
                if (!kehadiranPerSatker[satker]) {
                    kehadiranPerSatker[satker] = 0;
                }
                kehadiranPerSatker[satker]++;
            }
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
                    total_pegawai: pegawaiCount ? pegawaiCount.total_pegawai : 0,
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

        // Dapatkan semua peserta dari tabel jadwal_kegiatan_lokasi_satker untuk satker ini
        // Abaikan entry dummy dengan id_satker = 'NO_SATKER'
        const pesertaKegiatan = await JadwalKegiatanLokasiSatker.findAll({
            where: {
                id_kegiatan: id_kegiatan,
                id_satker: id_satker,
                nip: { [Op.ne]: null } // Hanya ambil yang punya NIP (peserta individu)
            },
            attributes: ['nip', 'lokasi_id', 'id_grup_peserta']
        });

        // Dapatkan semua NIP yang terdaftar sebagai peserta
        const nipPeserta = pesertaKegiatan.map(p => p.nip).filter(Boolean);
        
        if (nipPeserta.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    satker: {
                        id_satker: satkerData.KDSATKER,
                        nama_satker: satkerData.NMSATKER
                    },
                    statistik: {
                        total_pegawai: 0,
                        total_hadir: 0,
                        total_tidak_hadir: 0,
                        persentase_kehadiran: 0
                    },
                    pegawai: []
                }
            });
        }

        // Dapatkan data pegawai berdasarkan NIP yang terdaftar
        const pegawaiList = await MstPegawai.findAll({
            where: {
                NIP: { [Op.in]: nipPeserta },
                STATUSAKTIF: 'AKTIF'
            },
            attributes: ['NIP', 'NAMA', 'GLRDEPAN', 'GLRBELAKANG', 'KDSATKER'],
            order: [['NAMA', 'ASC']]
        });

        // Dapatkan NIP pegawai yang hadir untuk kegiatan ini
        const kehadiranData = await KehadiranKegiatan.findAll({
            where: {
                id_kegiatan: id_kegiatan,
                absen_nip: { [Op.in]: nipPeserta } // Hanya ambil kehadiran dari peserta yang terdaftar
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

// Download Excel untuk semua grup peserta dalam kegiatan
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

        // Ambil semua grup peserta untuk kegiatan ini
        const grupList = await GrupPesertaKegiatan.findAll({
            where: {
                id_kegiatan: parseInt(id_kegiatan)
            },
            include: [
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'ket', 'lat', 'lng']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        if (grupList.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tidak ada grup peserta untuk kegiatan ini'
            });
        }

        // Gabungkan grup dengan nama yang sama (khususnya untuk jenis OPD dengan id_satker yang sama)
        const mergedGroupsMap = {};
        
        for (const grup of grupList) {
            // Key untuk grouping: nama_grup + jenis_grup + id_satker (untuk OPD)
            const groupKey = grup.jenis_grup === 'opd' && grup.id_satker
                ? `${grup.nama_grup}_${grup.jenis_grup}_${grup.id_satker}`
                : `${grup.nama_grup}_${grup.jenis_grup}_${grup.id_grup_peserta}`; // Untuk grup khusus, tetap unik per grup
            
            if (!mergedGroupsMap[groupKey]) {
                mergedGroupsMap[groupKey] = {
                    grup: grup,
                    id_grup_list: [grup.id_grup_peserta],
                    lokasi_list: [grup.Lokasi].filter(l => l !== null)
                };
            } else {
                if (!mergedGroupsMap[groupKey].id_grup_list.includes(grup.id_grup_peserta)) {
                    mergedGroupsMap[groupKey].id_grup_list.push(grup.id_grup_peserta);
                }
                if (grup.Lokasi && !mergedGroupsMap[groupKey].lokasi_list.find(l => l && l.lokasi_id === grup.Lokasi.lokasi_id)) {
                    mergedGroupsMap[groupKey].lokasi_list.push(grup.Lokasi);
                }
            }
        }

        // Buat workbook Excel
        const workbook = new ExcelJS.Workbook();

        // Untuk setiap grup yang sudah digabung, buat sheet
        for (const groupKey in mergedGroupsMap) {
            const mergedGroup = mergedGroupsMap[groupKey];
            const grup = mergedGroup.grup;
            const idGrupList = mergedGroup.id_grup_list;
            // Hitung total peserta dari semua grup yang digabung
            const pesertaList = await PesertaGrupKegiatan.findAll({
                where: { id_grup_peserta: { [Op.in]: idGrupList } },
                attributes: ['nip']
            });

            // Hapus duplikat NIP
            const uniqueNipSet = new Set();
            pesertaList.forEach(p => {
                if (p.nip) {
                    uniqueNipSet.add(p.nip);
                }
            });
            const nipList = Array.from(uniqueNipSet);
            const totalPeserta = nipList.length;

            // Dapatkan data pegawai untuk setiap NIP
            const pegawaiList = await MstPegawai.findAll({
                where: {
                    NIP: { [Op.in]: nipList },
                    STATUSAKTIF: 'AKTIF'
                },
                attributes: ['NIP', 'NAMA', 'GLRDEPAN', 'GLRBELAKANG', 'KDSATKER']
            });

            // Dapatkan data kehadiran untuk kegiatan ini
            const kehadiranData = await KehadiranKegiatan.findAll({
                where: {
                    id_kegiatan: parseInt(id_kegiatan),
                    absen_nip: { [Op.in]: nipList }
                },
                attributes: ['absen_nip', 'absen_tgljam', 'absen_kat']
            });

            // Mapping kehadiran berdasarkan NIP
            const kehadiranMap = {};
            kehadiranData.forEach(k => {
                kehadiranMap[k.absen_nip] = {
                    hadir: true,
                    absen_tgljam: k.absen_tgljam,
                    absen_kat: k.absen_kat
                };
            });

            // Mapping NIP ke data pegawai
            const pegawaiMap = {};
            pegawaiList.forEach(p => {
                pegawaiMap[p.NIP] = {
                    nip: p.NIP,
                    nama: p.NAMA,
                    gelar_depan: p.GLRDEPAN || '',
                    gelar_belakang: p.GLRBELAKANG || '',
                    nama_lengkap: `${p.GLRDEPAN || ''} ${p.NAMA} ${p.GLRBELAKANG || ''}`.trim(),
                    kdsatker: p.KDSATKER
                };
            });

            // Gabungkan data peserta dengan data pegawai dan kehadiran
            const pegawaiWithAttendance = pesertaList.map(p => {
                const pegawai = pegawaiMap[p.nip] || {
                    nip: p.nip,
                    nama: p.nip,
                    nama_lengkap: p.nip,
                    gelar_depan: '',
                    gelar_belakang: '',
                    kdsatker: null
                };
                const kehadiran = kehadiranMap[p.nip] || null;

                return {
                    nip: pegawai.nip,
                    nama: pegawai.nama,
                    nama_lengkap: pegawai.nama_lengkap,
                    hadir: kehadiran !== null,
                    kehadiran_data: kehadiran
                };
            });

            // Hitung statistik
            const totalPegawai = pegawaiWithAttendance.length;
            const totalHadir = pegawaiWithAttendance.filter(p => p.hadir).length;
            const totalTidakHadir = totalPegawai - totalHadir;
            const persentaseKehadiran = totalPegawai > 0 ? Math.round((totalHadir / totalPegawai) * 100) : 0;

            // Dapatkan nama satker jika jenis grup OPD
            let namaSatker = null;
            if (grup.jenis_grup === 'opd' && grup.id_satker) {
                const satker = await SatkerTbl.findOne({
                    where: { KDSATKER: grup.id_satker },
                    attributes: ['NMSATKER']
                });
                namaSatker = satker ? satker.NMSATKER : null;
            }

            // Buat worksheet untuk grup ini (dengan nama yang unik untuk menghindari duplikat)
            // Excel worksheet name max 31 chars dan harus unik
            let worksheetName = grup.nama_grup || `Grup ${grup.id_grup_peserta}`;
            if (worksheetName.length > 31) {
                worksheetName = worksheetName.substring(0, 28) + '...';
            }
            // Pastikan nama unik
            let finalWorksheetName = worksheetName;
            let counter = 1;
            while (workbook.getWorksheet(finalWorksheetName)) {
                finalWorksheetName = `${worksheetName.substring(0, 28 - String(counter).length)}${counter}`;
                counter++;
            }
            const worksheet = workbook.addWorksheet(finalWorksheetName);

            // Tambahkan informasi laporan di atas
            const titleRow = worksheet.addRow(['', '', '', 'LAPORAN KEHADIRAN PEGAWAI']);
            titleRow.font = { bold: true, size: 16 };
            titleRow.alignment = { horizontal: 'center' };
            worksheet.addRow([]);

            worksheet.addRow(['', '', 'Nama Grup', `: ${grup.nama_grup}`]);
            if (namaSatker) {
                worksheet.addRow(['', '', 'Satuan Kerja', `: ${namaSatker}`]);
            }
            // Tampilkan semua lokasi jika ada lebih dari satu
            if (mergedGroup.lokasi_list && mergedGroup.lokasi_list.length > 0) {
                if (mergedGroup.lokasi_list.length === 1) {
                    worksheet.addRow(['', '', 'Lokasi', `: ${mergedGroup.lokasi_list[0].ket}`]);
                } else {
                    const lokasiNames = mergedGroup.lokasi_list.map(l => l.ket).join(', ');
                    worksheet.addRow(['', '', 'Lokasi', `: ${lokasiNames} (${mergedGroup.lokasi_list.length} lokasi)`]);
                }
            }
            worksheet.addRow(['', '', 'Tanggal Kegiatan', `: ${new Date(kegiatan.tanggal_kegiatan).toLocaleDateString('id-ID')}`]);
            if (kegiatan.jam_mulai && kegiatan.jam_selesai) {
                worksheet.addRow(['', '', 'Waktu Kegiatan', `: ${kegiatan.jam_mulai.substring(0, 5)} - ${kegiatan.jam_selesai.substring(0, 5)}`]);
            }
            worksheet.addRow(['', '', 'Nama Kegiatan', `: ${kegiatan.keterangan || '-'}`]);
            worksheet.addRow(['', '', 'Jenis Kegiatan', `: ${kegiatan.jenis_kegiatan}`]);
            worksheet.addRow([]);

            const summaryTitleRow = worksheet.addRow(['', '', 'RINGKASAN KEHADIRAN']);
            summaryTitleRow.font = { bold: true, size: 14 };
            worksheet.addRow(['', '', 'Total Pegawai', `: ${totalPegawai}`]);
            worksheet.addRow(['', '', 'Total Hadir', `: ${totalHadir}`]);
            worksheet.addRow(['', '', 'Total Tidak Hadir', `: ${totalTidakHadir}`]);
            worksheet.addRow(['', '', 'Persentase Kehadiran', `: ${persentaseKehadiran}%`]);
            worksheet.addRow([]);

            // Set header tabel
            worksheet.addRow(['', 'No', 'NIP', 'Nama Lengkap', 'Status Kehadiran', 'Waktu Kehadiran']);

            // Style header tabel
            const headerRow = worksheet.lastRow;
            headerRow.font = { bold: true };
            for (let col = 2; col <= 6; col++) {
                const cell = headerRow.getCell(col);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE6F3FF' }
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }

            // Set column widths
            worksheet.getColumn(1).width = 3;   // Space/Empty column
            worksheet.getColumn(2).width = 5;   // No
            worksheet.getColumn(3).width = 20;  // NIP
            worksheet.getColumn(4).width = 50;  // Nama Lengkap
            worksheet.getColumn(5).width = 20;  // Status Kehadiran
            worksheet.getColumn(6).width = 20;  // Waktu Kehadiran

            // Tambahkan data
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

                // Beri warna pada kolom status kehadiran
                const fillColor = pegawai.hadir
                    ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFFFE0' } } // light green
                    : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } }; // light red

                dataRow.getCell(5).fill = fillColor;

                // Tambahkan border pada setiap cell di row data
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
        }

        // Set filename
        const tanggalKegiatan = new Date(kegiatan.tanggal_kegiatan).toLocaleDateString('id-ID');
        const filename = `Laporan_Kehadiran_Semua_Grup_${kegiatan.jenis_kegiatan.replace(/\s+/g, '_')}_${tanggalKegiatan.replace(/\//g, '-')}.xlsx`;

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