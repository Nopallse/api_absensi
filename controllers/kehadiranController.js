const { Kehadiran, User, Lokasi, JamDinas, JamDinasDetail, DinasSetjam, SystemSetting, MstPegawai, MasterJadwalKegiatan, JadwalKegiatanLokasiSatker, KehadiranKegiatan, SatkerTbl, BidangTbl, BidangSub } = require('../models');
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const { validationResult } = require('express-validator');
const {
    getWIBDate,
    getTodayDate,
    parseTimeToDate,
    formatTime,
    getAttendanceStatus,
    getCheckoutStatus,
    getApelStatus
} = require('../utils/timeUtils');
const { getEffectiveLocation } = require('../utils/lokasiHierarchyUtils');
const {
    getPegawaiByNip,
    searchPegawai
} = require('../utils/masterDbUtils');
const {
    getUserFromCache,
    getKegiatanFromCache,
    getLokasiFromCache,
    invalidateUserCache,
    invalidateKegiatanCache,
    invalidateLokasiCache,
    cacheWrapper,
    kegiatanCache
} = require('../utils/cacheUtils');



// OPTIMIZED VERSION - Target < 100ms untuk 3000 concurrent users
const createKehadiranBiasa = async(req, res) => {
    const startTime = Date.now();
    try {
        // Validasi request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { type, latitude, longitude, lokasi_id } = req.body;
        const userId = req.user.id;
        const userNip = req.user.username;

        // PARALLEL QUERIES untuk performa maksimal
        const now = getWIBDate();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const absenTgl = getTodayDate();
        const currentDay = new Date().toLocaleDateString('id-ID', { weekday: 'long' }).toLowerCase();
        const startOfDay = new Date(absenTgl);
        const endOfDay = new Date(absenTgl);
        endOfDay.setHours(23, 59, 59, 999);

        // Jalankan semua query secara parallel dengan caching
        const [
            user,
            lokasi,
            pegawai,
            tipeSetting,
            existingKehadiran
        ] = await Promise.all([
            getUserFromCache(userId, () => User.findByPk(userId)),
            getLokasiFromCache(lokasi_id, () => Lokasi.findByPk(lokasi_id)),
            cacheWrapper(kegiatanCache, `pegawai_${userNip}`, () => MstPegawai.findOne({ where: { NIP: userNip } }), 600), // Cache 10 menit
            cacheWrapper(kegiatanCache, 'active_tipe_jadwal', () => SystemSetting.findOne({ where: { key: 'active_tipe_jadwal' } }), 1800), // Cache 30 menit
            Kehadiran.findOne({
                where: {
                    absen_nip: userNip,
                    absen_tgl: { [Op.between]: [startOfDay, endOfDay] }
                },
                attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
            })
        ]);

        // Validasi hasil query
        if (!user) {
            return res.status(404).json({ success: false, error: "User tidak ditemukan" });
        }
        if (!lokasi) {
            return res.status(404).json({ success: false, error: "Lokasi tidak ditemukan" });
        }
        if (!pegawai) {
            return res.status(404).json({ success: false, error: "Data pegawai tidak ditemukan" });
        }

        const activeTipe = tipeSetting ? tipeSetting.value : 'normal';

        // OPTIMIZED: Query jam dinas dengan caching
        const jamDetail = await cacheWrapper(
            kegiatanCache, 
            `jam_dinas_${pegawai.KDSATKER}_${activeTipe}_${currentDay}`,
            async () => {
                // Coba query utama dulu
                const dinasSetjam = await DinasSetjam.findOne({
                    where: { id_satker: pegawai.KDSATKER },
                    include: [{
                        model: JamDinas,
                        as: 'jamDinas',
                        include: [{
                            model: JamDinasDetail,
                            as: 'details',
                            where: { tipe: activeTipe, hari: currentDay }
                        }]
                    }]
                });

                if (dinasSetjam?.jamDinas?.details?.length > 0) {
                    return dinasSetjam.jamDinas.details[0];
                }

                // Fallback: cari tanpa filter hari
                const dinasSetjamFallback = await DinasSetjam.findOne({
                    where: { id_satker: pegawai.KDSATKER, id_bidang: null },
                    include: [{
                        model: JamDinas,
                        as: 'jamDinas',
                        include: [{
                            model: JamDinasDetail,
                            as: 'details',
                            where: { tipe: activeTipe }
                        }]
                    }]
                });

                if (dinasSetjamFallback?.jamDinas?.details) {
                    const todayDetails = dinasSetjamFallback.jamDinas.details.filter(d => d.hari === currentDay);
                    if (todayDetails.length > 0) {
                        return todayDetails[0];
                    }
                }

                return null;
            },
            300 // Cache 5 menit
        );

        if (!jamDetail) {
            return res.status(500).json({ success: false, error: "Konfigurasi jam kerja belum diatur untuk organisasi Anda" });
        }

        // Parse jam checkin dan checkout
        const jamMasukBatas = parseTimeToDate(jamDetail.jam_masuk_selesai, today);
        const jamKeluarBatas = parseTimeToDate(jamDetail.jam_pulang_mulai, today);

        // Handle berdasarkan type
        if (type === "masuk") {
            if (existingKehadiran?.absen_checkin) {
                return res.status(400).json({ success: false, error: "Sudah melakukan kehadiran masuk hari ini" });
            }

            const absenCheckin = formatTime(now);
            const absenApel = getApelStatus(now, jamMasukBatas);
            
            const newKehadiran = await Kehadiran.create({
                absen_nip: userNip,
                lokasi_id: lokasi_id,
                absen_tgl: absenTgl,
                absen_tgljam: now,
                absen_checkin: absenCheckin,
                absen_apel: absenApel,
                absen_kat: "HADIR"
            });

            const endTime = Date.now();
            console.log(`Create Kehadiran Masuk completed in ${endTime - startTime}ms`);
            return res.status(201).json({ success: true, data: newKehadiran });

        } else if (type === "keluar") {
            if (!existingKehadiran) {
                return res.status(400).json({ success: false, error: "Belum melakukan kehadiran masuk" });
            }
            if (existingKehadiran.absen_checkout) {
                return res.status(400).json({ success: false, error: "Sudah melakukan kehadiran keluar hari ini" });
            }

            const absenCheckout = formatTime(now);
            const absenSore = getCheckoutStatus(now, jamKeluarBatas);

            existingKehadiran.absen_checkout = absenCheckout;
            existingKehadiran.absen_sore = absenSore;
            await existingKehadiran.save();

            const endTime = Date.now();
            console.log(`Create Kehadiran Keluar completed in ${endTime - startTime}ms`);
            return res.status(200).json({ success: true, data: existingKehadiran });

        } else if (type === "izin" || type === "sakit" || type === "cuti" || type === "dinas") {
            if (existingKehadiran) {
                return res.status(400).json({ success: false, error: "Sudah melakukan kehadiran hari ini" });
            }

            const newKehadiran = await Kehadiran.create({
                absen_nip: userNip,
                lokasi_id: lokasi_id,
                absen_tgl: absenTgl,
                absen_tgljam: now,
                absen_kat: type
            });

            const endTime = Date.now();
            console.log(`Create Kehadiran ${type} completed in ${endTime - startTime}ms`);
            return res.status(201).json({ success: true, data: newKehadiran });
        }

        return res.status(400).json({ success: false, error: "Tipe kehadiran tidak valid" });
    } catch (error) {
        const endTime = Date.now();
        console.error(`Create Kehadiran Error (${endTime - startTime}ms):`, error);
        return res.status(500).json({
            error: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Fungsi helper untuk mendapatkan kegiatan hari ini (OPTIMIZED)
const getTodayActivitiesForUser = async (kdsatker) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
        
        // Query yang dioptimasi dengan filter langsung di database
        const activities = await MasterJadwalKegiatan.findAll({
            where: {
                tanggal_kegiatan: today
            },
            include: [
                {
                    model: JadwalKegiatanLokasiSatker,
                    where: {
                        id_satker: kdsatker // Filter langsung di database
                    },
                    required: true, // INNER JOIN untuk performa lebih baik
                    include: [
                        {
                            model: Lokasi,
                            where: {
                                status: true
                            },
                            required: true,
                            attributes: ['lokasi_id', 'ket', 'lat', 'lng', 'range'] // Hanya ambil field yang diperlukan
                        }
                    ],
                    attributes: ['id_satker'] // Hanya ambil field yang diperlukan
                }
            ],
            attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan', 'jam_mulai', 'jam_selesai'], // Hanya ambil field yang diperlukan
            order: [
                ['jam_mulai', 'ASC']
            ]
        });

        // Dapatkan data satker untuk semua kegiatan
        const satkerIds = [...new Set(activities.flatMap(activity => 
            activity.JadwalKegiatanLokasiSatkers.map(jkls => jkls.id_satker)
        ))];
        
        const satkerList = await SatkerTbl.findAll({
            where: {
                KDSATKER: {
                    [Op.in]: satkerIds
                }
            },
            attributes: ['KDSATKER', 'NMSATKER']
        });

        return activities.map(activity => ({
            id_kegiatan: activity.id_kegiatan,
            tanggal_kegiatan: activity.tanggal_kegiatan,
            jenis_kegiatan: activity.jenis_kegiatan,
            keterangan: activity.keterangan,
            jam_mulai: activity.jam_mulai,
            jam_selesai: activity.jam_selesai,
            lokasi_list: activity.JadwalKegiatanLokasiSatkers.map(jkls => {
                const satker = satkerList.find(s => s.KDSATKER === jkls.id_satker);
                return {
                    lokasi_id: jkls.Lokasi.lokasi_id,
                    ket: jkls.Lokasi.ket,
                    lat: jkls.Lokasi.lat,
                    lng: jkls.Lokasi.lng,
                    range: jkls.Lokasi.range,
                    satker: jkls.id_satker,
                    nama_satker: satker ? satker.NMSATKER : null
                };
            })
        }));
    } catch (error) {
        console.error('Error getting today activities:', error);
        return [];
    }
};

// Endpoint untuk mendapatkan kehadiran biasa hari ini (TERPISAH)
const getKehadiranBiasaToday = async(req, res) => {
    try {
        const userNip = req.user.username;
    
        // Mendapatkan waktu saat ini dalam WIB
        const now = new Date();
        const absenTgl = now.toISOString().split('T')[0];
    
        // Format tanggal untuk absen_tgl (YYYY-MM-DD)
        const startOfDay = new Date(absenTgl);
        const endOfDay = new Date(absenTgl);
        endOfDay.setHours(23, 59, 59, 999);
    
        // PARALLEL PROCESSING: Jalankan query yang independen secara bersamaan
        const [kehadiranBiasa, pegawai] = await Promise.all([
          // Cek kehadiran biasa hari ini
          Kehadiran.findOne({
            where: {
              absen_nip: userNip,
              absen_tgl: {
                [Op.between]: [startOfDay, endOfDay]
              }
            },
            attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
          }),
          // Dapatkan data pegawai untuk mendapatkan satker
          getPegawaiByNip(userNip)
        ]);
    
        if (!pegawai) {
          return res.status(404).json({ 
            success: false,
            message: "Data pegawai tidak ditemukan" 
          });
        }
    
        // PARALLEL PROCESSING: Jalankan query lokasi dan kehadiran kegiatan secara bersamaan
        const [effectiveLocation, kehadiranKegiatan] = await Promise.all([
          // Dapatkan lokasi efektif
          getEffectiveLocation(
            pegawai.KDSATKER,  // idSatker
            pegawai.BIDANGF,   // idBidang
            null               // idSubBidang (tidak ada di data pegawai saat ini)
          ),
          
        ]);

        const log_json = {
            success: true,
            message: "Data kehadiran dan lokasi berhasil ditemukan",
            data: {
              kehadiran_biasa: kehadiranBiasa,
              lokasi: effectiveLocation,
            }
        }
        console.log('log_json', JSON.stringify(log_json, null, 2));
    
        return res.status(200).json({
          success: true,
          message: "Data kehadiran dan lokasi berhasil ditemukan",
          data: {
            kehadiran_biasa: kehadiranBiasa,
            lokasi: effectiveLocation,
          }
        });
      } catch (error) {
        console.error('GetKehadiranDanLokasi Error:', error);
        return res.status(500).json({ 
          success: false,
          message: "Terjadi kesalahan server",
          error: error.message
        });
      }
};

// Endpoint untuk mendapatkan kehadiran kegiatan hari ini (TERPISAH)
const getKehadiranKegiatanToday = async(req, res) => {
    try {
        const userNip = req.user.username; // Menggunakan username sebagai NIP

        // Mendapatkan waktu saat ini dalam WIB
        const now = getWIBDate();
        const absenTgl = now.toISOString().split('T')[0];

        // Format tanggal untuk absen_tgl (YYYY-MM-DD)
        const startOfDay = new Date(absenTgl);
        const endOfDay = new Date(absenTgl);
        endOfDay.setHours(23, 59, 59, 999);

        // Dapatkan data pegawai untuk mendapatkan satker
        const pegawai = await getPegawaiByNip(userNip);
        
        if (!pegawai) {
            return res.status(404).json({ 
                success: false,
                message: "Data pegawai tidak ditemukan" 
            });
        }

        // PARALLEL PROCESSING: Jalankan query kegiatan dan kehadiran kegiatan secara bersamaan
        const [kegiatanHariIni, kehadiranKegiatan] = await Promise.all([
            // Dapatkan kegiatan hari ini
            getTodayActivitiesForUser(pegawai.KDSATKER),
            // Cek kehadiran kegiatan hari ini
            KehadiranKegiatan.findAll({
                where: {
                    absen_nip: userNip,
                    absen_tgl: {
                        [Op.between]: [startOfDay, endOfDay]
                    }
                },
                include: [
                    {
                        model: MasterJadwalKegiatan,
                        as: 'kegiatan',
                        attributes: ['id_kegiatan', 'jenis_kegiatan', 'keterangan', 'jam_mulai', 'jam_selesai']
                    }
                ],
                attributes: ['absen_tgljam', 'absen_kat']
            })
        ]);

        // Mapping kegiatan dengan status kehadiran
        const kegiatanWithAttendance = kegiatanHariIni.map(kegiatan => {
            const kehadiran = kehadiranKegiatan.find(k => k.id_kegiatan === kegiatan.id_kegiatan);
            return {
                ...kegiatan,
            };
        });

        res.status(200).json({
            success: true,
            message: "Data kegiatan dan kehadiran kegiatan berhasil ditemukan",
            data: {
                kegiatan_hari_ini: kegiatanWithAttendance,
                kehadiran_kegiatan: kehadiranKegiatan
            }
        });

    } catch (error) {
        console.error('Get Kehadiran Kegiatan Today Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get all kehadiran for a specific user (admin only)
const getKehadiranByUserId = async(req, res) => {
    try {

        const { user_id } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const { start_date, end_date, sort = 'desc' } = req.query;

        // Get user by ID to get the username (NIP)
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        // Build where condition for date filtering
        let whereCondition = {
            absen_nip: user.username // Menggunakan username sebagai NIP
        };
        
        // Add date filtering if provided
        if (start_date || end_date) {
            whereCondition.absen_tgl = {};
            
            if (start_date) {
                whereCondition.absen_tgl[Op.gte] = new Date(start_date);
            }
            
            if (end_date) {
                whereCondition.absen_tgl[Op.lte] = new Date(end_date);
            }
        }

        // Validate sort parameter
        const validSorts = ['asc', 'desc'];
        const sortOrder = validSorts.includes(sort.toLowerCase()) ? sort.toUpperCase() : 'DESC';

        // Get kehadiran data with pagination using Sequelize
        const { count, rows: kehadiran } = await Kehadiran.findAndCountAll({
            where: whereCondition,
            include: [{
                model: Lokasi,
                attributes: ['lat', 'lng', 'ket'],
                required: false
            }],
            order: [
                ['absen_tgl', sortOrder]
            ],
            offset,
            limit,
            attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });

        res.status(200).json({
            success: true,
            data: kehadiran,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: limit,
            },
            filters: {
                start_date: start_date || null,
                end_date: end_date || null,
                sort: sort
            }
        });
    } catch (error) {
        console.error('Get Kehadiran By User ID Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};



const getKehadiranBiasa = async(req, res) => {
    try {
        const userNip = req.user.username; // Menggunakan username sebagai NIP
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: kehadiran } = await Kehadiran.findAndCountAll({
            where: {
                absen_nip: userNip
            },
            include: [{
                model: Lokasi,
                attributes: ['lat', 'lng', 'ket'],
                required: false
            }],
            order: [
                ['absen_tgl', 'DESC']
            ],
            offset,
            limit,
            attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });

        // Get employee data from master database using utility
        const pegawaiData = await getPegawaiByNip(userNip);

        // Enrich kehadiran data with master employee data
        const enrichedKehadiran = kehadiran.map(item => {
            const kehadiranData = item.toJSON();
            return {
                ...kehadiranData,
                pegawai: pegawaiData ? {
                    nip: pegawaiData.NIP,
                    nama: pegawaiData.NAMA,
                    kdskpd: pegawaiData.KDSKPD,
                    kdsatker: pegawaiData.KDSATKER,
                    bidangf: pegawaiData.BIDANGF,
                    jenis_pegawai: pegawaiData.JENIS_PEGAWAI,
                    status_aktif: pegawaiData.STATUSAKTIF,
                    skpd: pegawaiData.SkpdTbl ? {
                        kdskpd: pegawaiData.SkpdTbl.KDSKPD,
                        nmskpd: pegawaiData.SkpdTbl.NMSKPD,
                        status_skpd: pegawaiData.SkpdTbl.StatusSKPD
                    } : null
                } : null
            };
        });

        res.status(200).json({
            success: true,
            data: enrichedKehadiran,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: limit,
            },
        });
    } catch (error) {
        console.error('Get Kehadiran Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const getAllKehadiran = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Ambil parameter filter/search
        const { search, startDate, satker, bidang, status } = req.query;

        // Auto-filter berdasarkan level admin
        let autoFilterSatker = null;
        let autoFilterBidang = null;

        // Level 2 = Admin OPD - filter berdasarkan satker
        if (req.user.level === '2' && req.adminOpd) {
            autoFilterSatker = req.adminOpd.id_satker;
            console.log(`Auto-filter Admin OPD: satker=${autoFilterSatker}`);
        }
        
        // Level 3 = Admin UPT - filter berdasarkan satker dan bidang
        if (req.user.level === '3' && req.adminUpt) {
            autoFilterSatker = req.adminUpt.id_satker;
            autoFilterBidang = req.adminUpt.id_bidang;
            console.log(`Auto-filter Admin UPT: satker=${autoFilterSatker}, bidang=${autoFilterBidang}`);
        }
        
        // Level 1 = Superadmin - tidak ada auto-filter
        if (req.user.level === '1') {
            console.log('Superadmin - tidak ada auto-filter');
        }

        // Build where clause untuk Kehadiran
        let whereClause = {};

        // Filter by tanggal
        if (startDate) {
            // Gunakan rentang tanggal untuk pencocokan yang lebih akurat
            const nextDay = new Date(startDate);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayStr = nextDay.toISOString().split('T')[0];
            
            whereClause.absen_tgl = {
                [Op.gte]: startDate,
                [Op.lt]: nextDayStr
            };
        }
        if (status) {
            // Cek apakah status termasuk ke dalam absen_apel
            const apelStatus = ['HAP', 'TAP'];
            const soreStatus = ['HAS', 'CP'];
            if (apelStatus.includes(status)) {
                whereClause.absen_apel = status;
            } else if (soreStatus.includes(status)) {
                whereClause.absen_sore = status;
            } else {
                // Jika status tidak valid, kembalikan data kosong
                return res.status(200).json({
                    success: true,
                    data: [],
                    pagination: {
                        currentPage: page,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: limit
                    }
                });
            }
        }

        // Search by username, email, atau absen_nip
        let userWhere = {};
        if (search) {
            userWhere = {
                [Op.or]: [
                    { username: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } }
                ]
            };
            // Juga search di absen_nip
            whereClause = {
                ...whereClause,
                [Op.or]: [
                    { absen_nip: { [Op.like]: `%${search}%` } },
                    whereClause
                ]
            };
        }

        // Query kehadiran dengan filter
        const { count, rows: kehadiran } = await Kehadiran.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['username', 'email'],
                    where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
                    required: false
                },
            ],
            order: [
                ['absen_tgl', 'DESC']
            ],
            offset,
            limit,
            attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });
        console.log(kehadiran);
        // Enrich kehadiran data with master employee data - Optimized
        let enrichedKehadiran = await Promise.all(kehadiran.map(async (item) => {
            const kehadiranData = item.toJSON();
            
            // Get employee data from master database using utility
            const pegawaiData = await getPegawaiByNip(kehadiranData.absen_nip);
            
           

            
            return {
                pegawai: {
                    nip: pegawaiData?.NIP || null,
                    nama: pegawaiData?.NAMA || null,
                    kdsatker: pegawaiData?.KDSATKER || null,
                    bidangf: pegawaiData?.BIDANGF || null,
                    subf: pegawaiData?.SUBF || null,
                    nm_unit_kerja: pegawaiData?.NM_UNIT_KERJA || null,
                },
                absen_checkin: kehadiranData.absen_checkin,
                absen_checkout: kehadiranData.absen_checkout,
                absen_apel: kehadiranData.absen_apel,
                absen_sore: kehadiranData.absen_sore,
                absen_tgl: kehadiranData.absen_tgl,
            };
        }));

        // Apply satker dan bidang filter setelah enrich data
        // Gunakan auto-filter jika tersedia, atau filter dari query parameter
        const finalSatker = autoFilterSatker || satker;
        const finalBidang = autoFilterBidang || bidang;
        
        if (finalSatker || finalBidang) {
            enrichedKehadiran = enrichedKehadiran.filter(item => {
                let matchSatker = true;
                let matchBidang = true;
                
                if (finalSatker) {
                    matchSatker = item.pegawai.kdsatker === finalSatker;
                }
                
                if (finalBidang) {
                    matchBidang = item.pegawai.bidangf === finalBidang;
                }
                
                return matchSatker && matchBidang;
            });
        }

        res.status(200).json({
            success: true,
            data: enrichedKehadiran,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get All Kehadiran Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
};

// Get detail kehadiran by ID (admin only)
const getKehadiranById = async(req, res) => {
    try {
        const { id } = req.params;

        // Get kehadiran by ID with user and lokasi details
        const kehadiran = await Kehadiran.findByPk(id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'email', 'level', 'id_opd', 'id_upt', 'status'],
                    required: false
                },
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'lat', 'lng', 'range', 'ket', 'status'],
                    required: false
                }
            ],
            attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });

        if (!kehadiran) {
            return res.status(404).json({ error: 'Kehadiran tidak ditemukan' });
        }

        // Get employee data from master database using utility
        const pegawaiData = await getPegawaiByNip(kehadiran.absen_nip);
        
        const kehadiranData = kehadiran.toJSON();
        const enrichedKehadiran = {
            ...kehadiranData,
            pegawai: pegawaiData ? {
                nip: pegawaiData.NIP,
                nama: pegawaiData.NAMA,
                kdskpd: pegawaiData.KDSKPD,
                kdsatker: pegawaiData.KDSATKER,
                bidangf: pegawaiData.BIDANGF,
                jenis_pegawai: pegawaiData.JENIS_PEGAWAI,
                status_aktif: pegawaiData.STATUSAKTIF,
                email: pegawaiData.EMAIL,
                notelp: pegawaiData.NOTELP,
                skpd: pegawaiData.SkpdTbl ? {
                    kdskpd: pegawaiData.SkpdTbl.KDSKPD,
                    nmskpd: pegawaiData.SkpdTbl.NMSKPD,
                    status_skpd: pegawaiData.SkpdTbl.StatusSKPD
                } : null
            } : null
        };

        res.status(200).json({
            success: true,
            data: enrichedKehadiran
        });
    } catch (error) {
        console.error('Get Kehadiran By ID Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Get attendance history with filters
const getAttendanceHistory = async(req, res) => {
    try {
        const userNip = req.user.username; // Menggunakan username sebagai NIP
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        const status = req.query.status; 
        const offset = (page - 1) * limit;
        console.log(req.query);

      
        // Build where clause
        const whereClause = {
            absen_nip: userNip,
        };

        // Add date range filter if provided
        if (startDate && endDate) {
            // Convert to start and end of day for proper filtering
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            whereClause.absen_tgl = {
                [Op.between]: [startOfDay, endOfDay],
            };
        }

        // Add status filter if provided
        if (status) {
            whereClause.absen_kat = status;
        }

        // Get kehadiran biasa data with pagination
        const whereClauseBiasa = { ...whereClause };
        
        const { count: countBiasa, rows: attendancesBiasa } = await Kehadiran.findAndCountAll({
            where: whereClauseBiasa,
            include: [{
                    model: User,
                    attributes: ['username', 'email'],
                },
                {
                    model: Lokasi,
                    attributes: ['lat', 'lng', 'ket']
                }
            ],
            order: [
                ['absen_tgl', 'ASC']
            ],
            offset,
            limit,
            attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });

        
        // Format the kehadiran biasa data
        const formattedAttendancesBiasa = attendancesBiasa.map(attendance => {
            const { absen_id, absen_nip, absen_tgl, absen_tgljam, absen_checkin, absen_checkout, absen_kat, absen_apel, absen_sore, User: user, Lokasi: lokasi } = attendance;

            return {
                absen_id: absen_id,
                absen_nip: absen_nip,
                absen_tgl: absen_tgl,
                absen_tgljam: absen_tgljam,
                absen_checkin: absen_checkin,
                absen_checkout: absen_checkout,
                absen_kat: absen_kat,
                absen_apel: absen_apel,
                absen_sore: absen_sore,
                user: user ? {
                    username: user.username,
                    email: user.email
                } : null,
                lokasi: lokasi ? {
                    lat: lokasi.lat,
                    lng: lokasi.lng,
                    keterangan: lokasi.ket
                } : null
            };
        });

    

        res.status(200).json({
            success: true,
            data: {
                kehadiran_biasa: {
                    data: formattedAttendancesBiasa,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(countBiasa / limit),
                        totalItems: countBiasa,
                        itemsPerPage: limit,
                    }
                },
                
            }
        });
    } catch (error) {
        console.error('Get Attendance History Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get monthly report
const getMonthlyReport = async(req, res) => {
    try {
        const userId = req.user.id;
        const userNip = req.user.username; // Menggunakan username sebagai NIP
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;

        // Format tanggal untuk query
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

        const attendances = await Kehadiran.findAll({
            where: {
                absen_nip: userNip,
                absen_tgl: {
                    [Op.between]: [startDate, endDate],
                },
            },
            order: [
                ['absen_tgl', 'ASC']
            ],
            attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });

        // Buat array untuk semua hari dalam bulan
        const daysInMonth = [];
        for (let i = 1; i <= lastDay; i++) {
            const date = `${year}-${month.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
            daysInMonth.push({
                date,
                day: new Date(date).getDay(), // 0 = Minggu, 1 = Senin, dst
                attendance: null,
            });
        }

        // Isi data kehadiran
        attendances.forEach(attendance => {
            const day = new Date(attendance.absen_tgl).getDate();
            daysInMonth[day - 1].attendance = {
                id: attendance.absen_id,
                kategori: attendance.absen_kat,
                jam_masuk: attendance.absen_checkin,
                jam_keluar: attendance.absen_checkout,
                status_sore: attendance.absen_sore
            };
        });

        // Hitung statistik
        const statistics = {
            total: attendances.length,
            hadir: attendances.filter(a => a.absen_kat === 'hadir').length,
            izin: attendances.filter(a => a.absen_kat === 'izin').length,
            sakit: attendances.filter(a => a.absen_kat === 'sakit').length,
            cuti: attendances.filter(a => a.absen_kat === 'cuti').length,
            dinas: attendances.filter(a => a.absen_kat === 'dinas').length,
            telat: attendances.filter(a => a.absen_kat === 'telat').length,
            pulangAwal: attendances.filter(a => a.absen_sore === 'awal').length,
        };

        res.status(200).json({
            success: true,
            data: daysInMonth,
            statistics,
            month: month,
            year: year,
        });
    } catch (error) {
        console.error('Get Monthly Report Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



// Fungsi untuk mendapatkan lokasi yang dapat diakses oleh user berdasarkan jadwal kegiatan
const getUserAccessibleLocations = async(req, res) => {
    try {
        const userId = req.user.id;
        const userNip = req.user.username;

        // Dapatkan data user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: "User tidak ditemukan" });
        }

        // Dapatkan lokasi berdasarkan jadwal kegiatan
        let lokasiAbsen = null;
        try {
            lokasiAbsen = await getLokasiAbsenBerdasarkanJadwal(userNip);
        } catch (error) {
            return res.status(500).json({ error: "Gagal mendapatkan lokasi absen: " + error.message });
        }
        
        if (lokasiAbsen.is_kegiatan && lokasiAbsen.lokasi) {
            // Jika ada jadwal kegiatan, kembalikan lokasi kegiatan
            res.status(200).json({
                success: true,
                data: [lokasiAbsen.lokasi],
                is_kegiatan: true,
                jadwal_kegiatan: lokasiAbsen.jadwal_kegiatan,
                skpd_info: {
                    kdskpd: lokasiAbsen.lokasi.id_skpd || 'KEGIATAN',
                    nama_pegawai: user.username
                }
            });
        } else {
            // Jika tidak ada jadwal kegiatan, kembalikan lokasi SKPD
            const pegawai = await MstPegawai.findOne({
                where: { NIP: userNip }
            });
            if (!pegawai) {
                return res.status(404).json({ error: "Data pegawai tidak ditemukan" });
            }
            
            res.status(200).json({
                success: true,
                data: lokasiAbsen.lokasi_list,
                is_kegiatan: false,
                jadwal_kegiatan: null,
                skpd_info: {
                    kdskpd: pegawai.KDSKPD,
                    nama_pegawai: pegawai.NAMA
                }
            });
        }
    } catch (error) {
        console.error('Get User Accessible Locations Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Fungsi untuk mendapatkan lokasi absen berdasarkan jadwal kegiatan
const getLokasiAbsenBerdasarkanJadwal = async (userNip) => {
    try {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
        
        // Dapatkan data pegawai
        const pegawai = await MstPegawai.findOne({
            where: { NIP: userNip }
        });
        
        if (!pegawai) {
            throw new Error('Data pegawai tidak ditemukan');
        }
        
        // Cek apakah ada jadwal kegiatan hari ini dengan pembagian SKPD
        const jadwalKegiatanSkpd = await JadwalKegiatanLokasiSatker.findOne({
            where: {
                id_satker: pegawai.KDSATKER
            },
            include: [
                {
                    model: MasterJadwalKegiatan,
                    where: { tanggal_kegiatan: todayString }
                },
                {
                    model: Lokasi
                }
            ]
        });
        
        // Jika ada jadwal kegiatan dengan pembagian SKPD
        if (jadwalKegiatanSkpd) {
            console.log('Ada jadwal kegiatan hari ini dengan pembagian SKPD:', jadwalKegiatanSkpd.MasterJadwalKegiatan.jenis_kegiatan);
            console.log('Lokasi kegiatan untuk SKPD', pegawai.KDSATKER, ':', jadwalKegiatanSkpd.Lokasi.ket);
            
            return {
                lokasi: jadwalKegiatanSkpd.Lokasi,
                is_kegiatan: true,
                jadwal_kegiatan: jadwalKegiatanSkpd.MasterJadwalKegiatan,
                skpd_info: {
                    kdskpd: pegawai.KDSATKER
                }
            };
        }
        

        
        // Jika tidak ada jadwal kegiatan, gunakan lokasi berdasarkan SKPD/Satker/Bidang
        const lokasiList = await Lokasi.findAll({
            where: {
                [Op.or]: [
                    { id_skpd: pegawai.KDSKPD },
                    { id_satker: pegawai.KDSATKER },
                    { id_bidang: pegawai.BIDANGF }
                ],
                status: true
            }
        });
        
        console.log('Lokasi untuk pegawai', pegawai.NIP, '(SKPD:', pegawai.KDSKPD, 'SATKER:', pegawai.KDSATKER, 'BIDANG:', pegawai.BIDANGF, '):', lokasiList.map(l => l.ket));
        
        return {
            lokasi_list: lokasiList,
            is_kegiatan: false,
            jadwal_kegiatan: null
        };
    } catch (error) {
        console.error('Error getting lokasi absen:', error);
        throw error;
    }
};

// Get monthly attendance with filters (admin only)
const getMonthlyAttendanceByFilter = async (req, res) => {
    try {
        const { 
            year = new Date().getFullYear(), 
            month = new Date().getMonth() + 1,
            satker,
            bidang,
            user_id,
            page = 1,
            limit = 10
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Auto-filter berdasarkan level admin
        let autoFilterSatker = null;
        let autoFilterBidang = null;

        // Level 2 = Admin OPD - filter berdasarkan satker
        if (req.user.level === '2' && req.adminOpd) {
            autoFilterSatker = req.adminOpd.id_satker;
            console.log(`Auto-filter Admin OPD (Monthly): satker=${autoFilterSatker}`);
        }
        
        // Level 3 = Admin UPT - filter berdasarkan satker dan bidang
        if (req.user.level === '3' && req.adminUpt) {
            autoFilterSatker = req.adminUpt.id_satker;
            autoFilterBidang = req.adminUpt.id_bidang;
            console.log(`Auto-filter Admin UPT (Monthly): satker=${autoFilterSatker}, bidang=${autoFilterBidang}`);
        }
        
        // Level 1 = Superadmin - tidak ada auto-filter
        if (req.user.level === '1') {
            console.log('Superadmin (Monthly) - tidak ada auto-filter');
        }

        // Validate year and month
        const selectedYear = parseInt(year);
        const selectedMonth = parseInt(month);
        
        if (selectedYear < 2020 || selectedYear > 2030) {
            return res.status(400).json({ error: 'Tahun tidak valid' });
        }
        
        if (selectedMonth < 1 || selectedMonth > 12) {
            return res.status(400).json({ error: 'Bulan tidak valid' });
        }

        // Get date range for the selected month
        const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay}`;

        // Build where clause
        const whereClause = {
            absen_tgl: {
                [Op.between]: [startDate, endDate]
            }
        };

        // Add user filter if provided
        if (user_id) {
            whereClause.absen_nip = user_id;
        }

        // Note: satker dan bidang filter akan diterapkan setelah enrich data
        // karena filter ini memerlukan data master pegawai

        // Get attendance data with pagination
        const { count, rows: attendances } = await Kehadiran.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'email', 'level', 'id_opd', 'id_upt', 'status']
                },
                {
                    model: Lokasi,
                    attributes: ['lokasi_id', 'ket', 'lat', 'lng']
                }
            ],
            order: [
                ['absen_tgl', 'ASC'],
                ['absen_nip', 'ASC']
            ],
            offset,
            limit: parseInt(limit),
            attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });

        // Enrich attendance data with master employee data and apply satker/bidang filter
        let enrichedAttendances = await Promise.all(attendances.map(async (item) => {
            const attendanceData = item.toJSON();
            
            // Get employee data from master database using utility
            const pegawaiData = await getPegawaiByNip(attendanceData.absen_nip);
            
            // Get organizational data
            let satkerData = null;
            let bidangData = null;
            let subBidangData = null;
            let namaUnitKerja = null;

            if (pegawaiData) {
                // Get Satker data
                if (pegawaiData.KDSATKER) {
                    const satker = await SatkerTbl.findByPk(pegawaiData.KDSATKER, {
                        attributes: ['KDSATKER', 'NMSATKER']
                    });
                    if (satker) {
                        satkerData = {
                            kdsatker: satker.KDSATKER,
                            nmsatker: satker.NMSATKER
                        };
                    }
                }

                // Get Bidang data
                if (pegawaiData.BIDANGF) {
                    const bidang = await BidangTbl.findByPk(pegawaiData.BIDANGF, {
                        attributes: ['BIDANGF', 'NMBIDANG']
                    });
                    if (bidang) {
                        bidangData = {
                            bidangf: bidang.BIDANGF,
                            nmbidang: bidang.NMBIDANG
                        };
                    }
                }

                // Get Sub Bidang data
                if (pegawaiData.SUBF) {
                    const subBidang = await BidangSub.findByPk(pegawaiData.SUBF, {
                        attributes: ['SUBF', 'NMSUB']
                    });
                    if (subBidang) {
                        subBidangData = {
                            subf: subBidang.SUBF,
                            nmsub: subBidang.NMSUB
                        };
                    }
                }

                // Determine nama unit kerja based on hierarchy
                if (subBidangData) {
                    namaUnitKerja = subBidangData.nmsub;
                } else if (bidangData) {
                    namaUnitKerja = bidangData.nmbidang;
                } else if (satkerData) {
                    namaUnitKerja = satkerData.nmsatker;
                } else {
                    namaUnitKerja = pegawaiData.NM_UNIT_KERJA || null;
                }
            }
            
            return {
                pegawai: {
                    nip: pegawaiData?.NIP || null,
                    nama: pegawaiData?.NAMA || null
                },
                absen_checkin: attendanceData.absen_checkin,
                absen_checkout: attendanceData.absen_checkout,
                absen_apel: attendanceData.absen_apel,
                absen_sore: attendanceData.absen_sore,
                nama_unit_kerja: namaUnitKerja,
                satker: satkerData,
                bidang: bidangData,
                sub_bidang: subBidangData,
                lokasi: attendanceData.Lokasi ? {
                    lokasi_id: attendanceData.lokasi_id,
                    lat: attendanceData.Lokasi.lat,
                    lng: attendanceData.Lokasi.lng,
                    ket: attendanceData.Lokasi.ket
                } : null
            };
        }));

        // Apply satker dan bidang filter setelah enrich data
        // Gunakan auto-filter jika tersedia, atau filter dari query parameter
        const finalSatker = autoFilterSatker || satker;
        const finalBidang = autoFilterBidang || bidang;
        
        if (finalSatker || finalBidang) {
            enrichedAttendances = enrichedAttendances.filter(item => {
                let matchSatker = true;
                let matchBidang = true;
                
                if (finalSatker) {
                    matchSatker = item.satker && item.satker.kdsatker === finalSatker;
                }
                
                if (finalBidang) {
                    matchBidang = item.bidang && item.bidang.bidangf === finalBidang;
                }
                
                return matchSatker && matchBidang;
            });
        }

        // Get summary statistics for the month berdasarkan model kehadiran
        // Karena kita sudah menerapkan filter satker/bidang pada enrichedAttendances,
        // kita perlu menghitung ulang statistics berdasarkan data yang sudah difilter
        const stats = {
            total: 0,
            HADIR: 0,
            // Status apel
            HAP: 0,  // Hadir Apel Pagi
            TAP: 0,  // Telat Apel Pagi
            // Status sore
            HAS: 0,  // Hadir Apel Sore
            CP: 0    // Cepat Pulang
        };

        // Calculate statistics from enriched and filtered data
        enrichedAttendances.forEach(item => {
            stats.total += 1;
            
            // Count based on absen_apel
            if (item.absen_apel === 'HAP') {
                stats.HAP += 1;
            } else if (item.absen_apel === 'TAP') {
                stats.TAP += 1;
            }
            
            // Count based on absen_sore
            if (item.absen_sore === 'HAS') {
                stats.HAS += 1;
            } else if (item.absen_sore === 'CP') {
                stats.CP += 1;
            }
            
            // Count HADIR (any attendance record)
            stats.HADIR += 1;
        });

        // Get daily breakdown berdasarkan data yang sudah difilter
        const dailyBreakdown = {};
        
        // Process enriched and filtered data for daily breakdown
        enrichedAttendances.forEach(item => {
            // We need to get the date from the original attendance data
            // Since we don't have absen_tgl in enriched data, we need to get it from original data
            const originalAttendance = attendances.find(att => att.absen_nip === item.pegawai.nip);
            if (!originalAttendance) return;
            
            const date = originalAttendance.absen_tgl;
            
            if (!dailyBreakdown[date]) {
                dailyBreakdown[date] = {
                    date,
                    HADIR: 0,
                    // Status apel
                    HAP: 0,  // Hadir Apel Pagi
                    TAP: 0,  // Telat Apel Pagi
                    // Status sore
                    HAS: 0,  // Hadir Apel Sore
                    CP: 0,   // Cepat Pulang
                    total: 0
                };
            }
            
            // Count based on absen_apel
            if (item.absen_apel === 'HAP') {
                dailyBreakdown[date].HAP += 1;
            } else if (item.absen_apel === 'TAP') {
                dailyBreakdown[date].TAP += 1;
            }
            
            // Count based on absen_sore
            if (item.absen_sore === 'HAS') {
                dailyBreakdown[date].HAS += 1;
            } else if (item.absen_sore === 'CP') {
                dailyBreakdown[date].CP += 1;
            }
            
            // Count HADIR (any attendance record)
            dailyBreakdown[date].HADIR += 1;
            dailyBreakdown[date].total += 1;
        });

        // Convert daily breakdown to array and sort by date
        const dailyBreakdownArray = Object.values(dailyBreakdown).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            success: true,
            data: {
                month: selectedMonth,
                year: selectedYear,
                period: `${selectedMonth}/${selectedYear}`,
                summary: stats,
                dailyBreakdown: dailyBreakdownArray,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(enrichedAttendances.length / parseInt(limit)),
                    totalItems: enrichedAttendances.length,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get Monthly Attendance By Filter Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get monthly attendance summary by user (admin only)
const getMonthlyAttendanceSummaryByUser = async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        const { 
            year = new Date().getFullYear(), 
            month = new Date().getMonth() + 1,
            lokasi_id,
            page = 1,
            limit = 10
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Validate year and month
        const selectedYear = parseInt(year);
        const selectedMonth = parseInt(month);
        
        if (selectedYear < 2020 || selectedYear > 2030) {
            return res.status(400).json({ error: 'Tahun tidak valid' });
        }
        
        if (selectedMonth < 1 || selectedMonth > 12) {
            return res.status(400).json({ error: 'Bulan tidak valid' });
        }

        // Get date range for the selected month
        const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${lastDay}`;

        // Build where clause
        const whereClause = {
            absen_tgl: {
                [Op.between]: [startDate, endDate]
            }
        };

        // Add location filter if provided
        if (lokasi_id) {
            whereClause.lokasi_id = lokasi_id;
        }

        // Get attendance summary by user
        const { count, rows: userSummaries } = await Kehadiran.findAndCountAll({
            where: whereClause,
            include: [{
                model: User,
                attributes: ['id', 'username', 'email', 'level', 'id_opd', 'id_upt', 'status']
            }],
            attributes: [
                'absen_nip',
                [Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'total_attendance'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'hadir' THEN 1 ELSE 0 END")), 'hadir_count'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'telat' THEN 1 ELSE 0 END")), 'telat_count'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'izin' THEN 1 ELSE 0 END")), 'izin_count'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'sakit' THEN 1 ELSE 0 END")), 'sakit_count'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'cuti' THEN 1 ELSE 0 END")), 'cuti_count'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'dinas' THEN 1 ELSE 0 END")), 'dinas_count']
            ],
            group: ['absen_nip', 'User.id', 'User.username', 'User.email', 'User.level', 'User.id_opd', 'User.id_upt', 'User.status'],
            order: [[Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'DESC']],
            offset,
            limit: parseInt(limit)
        });

        // Format user summaries
        const formattedUserSummaries = userSummaries.map(summary => {
            const totalAttendance = parseInt(summary.dataValues.total_attendance);
            const hadirCount = parseInt(summary.dataValues.hadir_count);
            const telatCount = parseInt(summary.dataValues.telat_count);
            
            return {
                user: summary.User,
                summary: {
                    totalAttendance,
                    hadir: hadirCount,
                    telat: telatCount,
                    izin: parseInt(summary.dataValues.izin_count),
                    sakit: parseInt(summary.dataValues.sakit_count),
                    cuti: parseInt(summary.dataValues.cuti_count),
                    dinas: parseInt(summary.dataValues.dinas_count),
                    attendanceRate: totalAttendance > 0 ? Math.round((hadirCount / totalAttendance) * 100) : 0,
                    onTimeRate: totalAttendance > 0 ? Math.round(((hadirCount + telatCount) / totalAttendance) * 100) : 0
                }
            };
        });

        res.status(200).json({
            success: true,
            data: {
                month: selectedMonth,
                year: selectedYear,
                period: `${selectedMonth}/${selectedYear}`,
                userSummaries: formattedUserSummaries,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get Monthly Attendance Summary By User Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Fungsi untuk mengecek data kehadiran hari ini
const checkTodayAttendance = async (req, res) => {
    try {
        const userNip = req.user.username;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        console.log('Checking attendance for today:', today);
        console.log('User NIP:', userNip);
        
        // Cek data kehadiran hari ini
        const todayAttendance = await Kehadiran.findOne({
            where: {
                absen_nip: userNip,
                absen_tgl: {
                    [Op.between]: [today, tomorrow]
                }
            },
            attributes: ['absen_id', 'absen_nip', 'absen_tgl', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });
        
        // Cek semua data kehadiran user (tanpa filter tanggal)
        const allAttendance = await Kehadiran.findAll({
            where: {
                absen_nip: userNip
            },
            attributes: ['absen_id', 'absen_nip', 'absen_tgl', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore'],
            order: [['absen_tgl', 'DESC']],
            limit: 5
        });
        
        res.status(200).json({
            success: true,
            today: today.toISOString(),
            today_attendance: todayAttendance,
            recent_attendance: allAttendance,
            debug_info: {
                user_nip: userNip,
                query_date_range: {
                    start: today.toISOString(),
                    end: tomorrow.toISOString()
                }
            }
        });
    } catch (error) {
        console.error('Check Today Attendance Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Fungsi helper untuk membuat kehadiran biasa dari kegiatan
const createKehadiranBiasaFromKegiatan = async (userNip, lokasiId, kegiatan, waktuAbsen) => {
    try {
        const today = new Date();
        const absenTgl = today.toISOString().split('T')[0];
        const startOfDay = new Date(absenTgl);
        const endOfDay = new Date(absenTgl);
        endOfDay.setHours(23, 59, 59, 999);

        // Cek apakah sudah ada kehadiran biasa hari ini
        const existingKehadiran = await Kehadiran.findOne({
            where: {
                absen_nip: userNip,
                absen_tgl: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        });

        if (existingKehadiran) {
            console.log(`Kehadiran biasa sudah ada untuk ${userNip} hari ini`);
            return existingKehadiran;
        }

        // Format waktu untuk absen_checkin (HH:MM:SS)
        const absenCheckin = waktuAbsen.toTimeString().split(' ')[0];

        // Tentukan status apel berdasarkan jam kegiatan
        let absenApel = null;
        let absenSore = null;
        
        if (kegiatan.include_absen === 'pagi' || kegiatan.include_absen === 'keduanya') {
            // Jika kegiatan menggantikan absen pagi, set status apel
            if (kegiatan.jam_mulai) {
                const jamKegiatan = new Date(`2000-01-01T${kegiatan.jam_mulai}`);
                const jamAbsen = new Date(`2000-01-01T${absenCheckin}`);
                
                // Jika absen sebelum atau sama dengan jam kegiatan, HAP (Hadir Apel Pagi)
                // Jika absen setelah jam kegiatan, TAP (Telat Apel Pagi)
                absenApel = jamAbsen <= jamKegiatan ? 'HAP' : 'TAP';
            } else {
                absenApel = 'HAP'; // Default HAP jika tidak ada jam kegiatan
            }
        }

        if (kegiatan.include_absen === 'sore' || kegiatan.include_absen === 'keduanya') {
            // Jika kegiatan menggantikan absen sore, set status sore
            if (kegiatan.jam_selesai) {
                const jamSelesaiKegiatan = new Date(`2000-01-01T${kegiatan.jam_selesai}`);
                const jamAbsen = new Date(`2000-01-01T${absenCheckin}`);
                
                // Jika absen sebelum jam selesai kegiatan, HAS (Hadir Apel Sore)
                // Jika absen setelah jam selesai kegiatan, CP (Cepat Pulang)
                absenSore = jamAbsen < jamSelesaiKegiatan ? 'HAS' : 'CP';
            } else {
                absenSore = 'HAS'; // Default HAS jika tidak ada jam selesai kegiatan
            }
        }

        // Buat kehadiran biasa
        const kehadiranBiasa = await Kehadiran.create({
            absen_nip: userNip,
            lokasi_id: lokasiId,
            absen_tgl: absenTgl,
            absen_tgljam: waktuAbsen,
            absen_checkin: absenCheckin,
            absen_apel: absenApel,
            absen_sore: absenSore,
            absen_kat: 'HADIR'
        });

        console.log(`Kehadiran biasa otomatis dibuat untuk ${userNip} dari kegiatan ${kegiatan.jenis_kegiatan}`);
        return kehadiranBiasa;

    } catch (error) {
        console.error('Error creating kehadiran biasa from kegiatan:', error);
        // Jangan throw error agar tidak mengganggu proses utama
        return null;
    }
};

// Fungsi untuk membuat kehadiran kegiatan - OPTIMIZED VERSION
const createKehadiranKegiatan = async (req, res) => {
    const startTime = Date.now();
    try {
        const { id_kegiatan, latitude, longitude, lokasi_id } = req.body;
        const userId = req.user.id;
        const userNip = req.user.username;

        // Validasi input
        if (!id_kegiatan || !latitude || !longitude || !lokasi_id) {
            return res.status(400).json({
                success: false,
                error: 'id_kegiatan, latitude, longitude, dan lokasi_id harus diisi'
            });
        }

        // PARALLEL QUERIES untuk performa maksimal
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const startOfDay = new Date(todayString);
        const endOfDay = new Date(todayString);
        endOfDay.setHours(23, 59, 59, 999);

        // Jalankan semua query secara parallel dengan caching
        const [
            user,
            kegiatan,
            lokasi,
            existingKehadiran
        ] = await Promise.all([
            getUserFromCache(userId, () => User.findByPk(userId)),
            getKegiatanFromCache(id_kegiatan, () => MasterJadwalKegiatan.findByPk(id_kegiatan)),
            getLokasiFromCache(lokasi_id, () => Lokasi.findByPk(lokasi_id)),
            KehadiranKegiatan.findOne({
                where: {
                    absen_nip: userNip,
                    id_kegiatan: id_kegiatan,
                    absen_tgl: {
                        [Op.between]: [startOfDay, endOfDay]
                    }
                }
            })
        ]);

        // Validasi hasil query
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "User tidak ditemukan" 
            });
        }

        if (!kegiatan) {
            return res.status(404).json({ 
                success: false,
                error: "Kegiatan tidak ditemukan" 
            });
        }

        if (!lokasi) {
            return res.status(404).json({ 
                success: false,
                error: "Lokasi tidak ditemukan" 
            });
        }

        if (existingKehadiran) {
            return res.status(400).json({
                success: false,
                error: 'Anda sudah melakukan kehadiran untuk kegiatan ini hari ini'
            });
        }

        // Buat kehadiran kegiatan
        const kehadiranKegiatan = await KehadiranKegiatan.create({
            absen_nip: userNip,
            lokasi_id: lokasi_id,
            id_kegiatan: id_kegiatan,
            absen_tgl: startOfDay,
            absen_tgljam: new Date(),
            absen_kat: 'HADIR'
        });

        // Cek apakah kegiatan ini menggantikan absen biasa - ASYNC tanpa await
        if (kegiatan.include_absen && kegiatan.include_absen !== 'none') {
            // Jalankan di background tanpa menunggu
            createKehadiranBiasaFromKegiatan(userNip, lokasi_id, kegiatan, kehadiranKegiatan.absen_tgljam)
                .catch(err => console.error('Background kehadiran biasa error:', err));
        }

        // Invalidate cache yang relevan
        invalidateUserCache(userId);
        invalidateKegiatanCache(id_kegiatan);

        const endTime = Date.now();
        console.log(`Create Kehadiran Kegiatan completed in ${endTime - startTime}ms`);

        res.status(201).json({
            success: true,
            message: 'Kehadiran kegiatan berhasil dicatat',
            data: {
                absen_id: kehadiranKegiatan.absen_id,
                id_kegiatan: kehadiranKegiatan.id_kegiatan,
                absen_tgljam: kehadiranKegiatan.absen_tgljam,
                kegiatan: {
                    id_kegiatan: kegiatan.id_kegiatan,
                    jenis_kegiatan: kegiatan.jenis_kegiatan,
                    keterangan: kegiatan.keterangan,
                    jam_mulai: kegiatan.jam_mulai,
                    jam_selesai: kegiatan.jam_selesai
                }
            }
        });

    } catch (error) {
        const endTime = Date.now();
        console.error(`Create Kehadiran Kegiatan Error (${endTime - startTime}ms):`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Fungsi untuk mendapatkan semua kegiatan dengan status kehadiran user
const getKehadiranKegiatan = async (req, res) => {
    try {
        const userNip = req.user.username;
        const { page = 1, limit = 10, tanggal_mulai, tanggal_selesai } = req.query;
        console.log(req.query);
        // Build where condition untuk kegiatan
        const kegiatanWhereCondition = {};
        const pegawai = await MstPegawai.findOne({
            where: { NIP: userNip }
        });

        // Add date filter if provided
        if (tanggal_mulai && tanggal_selesai) {
            kegiatanWhereCondition.tanggal_kegiatan = {
                [Op.gte]: new Date(tanggal_mulai),
                [Op.lte]: new Date(tanggal_selesai)
            };
        }

        const offset = (page - 1) * limit;

        // Dapatkan semua kegiatan dengan pagination
        const { count, rows: kegiatanList } = await MasterJadwalKegiatan.findAndCountAll({
            where: kegiatanWhereCondition,
            include: [
                {
                    model: JadwalKegiatanLokasiSatker,
                    where: {
                        id_satker: pegawai.KDSATKER
                    },
                    required: true,
                    attributes: ['id', 'id_satker', 'lokasi_id']
                }
            ],
            order: [['tanggal_kegiatan', 'DESC'], ['jam_mulai', 'ASC']],
            limit: parseInt(limit),
            offset: offset
        });

        // Dapatkan lokasi untuk kegiatan-kegiatan tersebut
        const lokasiIds = [...new Set(kegiatanList.flatMap(k => 
            k.JadwalKegiatanLokasiSatkers.map(jkls => jkls.lokasi_id)
        ))];
        
        // Dapatkan semua id_satker yang terlibat
        const satkerIds = [...new Set(kegiatanList.flatMap(k => 
            k.JadwalKegiatanLokasiSatkers.map(jkls => jkls.id_satker)
        ))];
        
        const [lokasiList, satkerList] = await Promise.all([
            Lokasi.findAll({
                where: {
                    lokasi_id: {
                        [Op.in]: lokasiIds
                    },
                    status: true
                },
                attributes: ['lokasi_id', 'ket', 'lat', 'lng', 'range']
            }),
            SatkerTbl.findAll({
                where: {
                    KDSATKER: {
                        [Op.in]: satkerIds
                    }
                },
                attributes: ['KDSATKER', 'NMSATKER']
            })
        ]);

        // Dapatkan kehadiran user untuk kegiatan-kegiatan tersebut
        const kegiatanIds = kegiatanList.map(kegiatan => kegiatan.id_kegiatan);
        const kehadiranUser = await KehadiranKegiatan.findAll({
            where: {
                absen_nip: userNip,
                id_kegiatan: {
                    [Op.in]: kegiatanIds
                }
            },
            attributes: ['id_kegiatan', 'absen_tgljam', 'absen_kat', 'lokasi_id']
        });

        // Mapping kegiatan dengan status kehadiran
        const kegiatanWithAttendance = kegiatanList.map(kegiatan => {
            const kehadiran = kehadiranUser.find(k => k.id_kegiatan === kegiatan.id_kegiatan);
            
            // Pastikan JadwalKegiatanLokasiSatkers ada dan tidak null
            const lokasiListData = kegiatan.JadwalKegiatanLokasiSatkers 
                ? kegiatan.JadwalKegiatanLokasiSatkers
                    .filter(jkls => jkls && jkls.lokasi_id) // Filter yang tidak null
                    .map(jkls => {
                        const lokasi = lokasiList.find(l => l.lokasi_id === jkls.lokasi_id);
                        const satker = satkerList.find(s => s.KDSATKER === jkls.id_satker);
                        return lokasi ? {
                            lokasi_id: lokasi.lokasi_id,
                            ket: lokasi.ket,
                            lat: lokasi.lat,
                            lng: lokasi.lng,
                            range: lokasi.range,
                            satker: jkls.id_satker,
                            nama_satker: satker ? satker.NMSATKER : null
                        } : null;
                    })
                    .filter(l => l !== null) // Filter hasil null
                : [];
            
            return {
                id_kegiatan: kegiatan.id_kegiatan,
                tanggal_kegiatan: kegiatan.tanggal_kegiatan,
                jenis_kegiatan: kegiatan.jenis_kegiatan,
                keterangan: kegiatan.keterangan,
                jam_mulai: kegiatan.jam_mulai,
                jam_selesai: kegiatan.jam_selesai,
                lokasi_list: lokasiListData,
                kehadiran_data: kehadiran ? {
                    absen_tgljam: kehadiran.absen_tgljam,
                    absen_kat: kehadiran.absen_kat,
                    lokasi_id: kehadiran.lokasi_id
                } : null
            };
        });

        res.json({
            success: true,
            data: kegiatanWithAttendance,
            pagination: {
                current_page: parseInt(page),
                per_page: parseInt(limit),
                total: count,
                total_pages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        console.error('Get Kehadiran Kegiatan Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    createKehadiranBiasa,
    getKehadiranBiasaToday,
    getKehadiranKegiatanToday,
    getKehadiranByUserId,
    getKehadiranById,
    getAllKehadiran,
    getAttendanceHistory,
    getMonthlyReport,
    getUserAccessibleLocations,
    getKehadiranBiasa,
    getMonthlyAttendanceByFilter,
    getMonthlyAttendanceSummaryByUser,
    checkTodayAttendance,
    createKehadiranKegiatan,
    getKehadiranKegiatan
};