const { 
    User, 
    Kehadiran, 
    Lokasi, 
    DeviceResetRequest,
    SatkerTbl,
    BidangTbl,
    BidangSub,
    MasterJadwalKegiatan
} = require('../models');
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const {
    getTodayDate,
} = require('../utils/timeUtils');

// Dashboard khusus Super Admin dengan metrics lengkap
const getSuperAdminDashboard = async (req, res) => {
    try {
        // === PAGINATION & FILTERING PARAMETERS ===
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { search, startDate, endDate, lokasi_id, status } = req.query;

        // === SYSTEM OVERVIEW ===
        const totalUsers = await User.count();

        // === ORGANIZATIONAL STRUCTURE STATISTICS ===
        const totalSatker = await SatkerTbl.count();
        const totalBidang = await BidangTbl.count();
        const totalSubBidang = await BidangSub.count();

        // === KEGIATAN HARI INI ===
        const today = getTodayDate();
        const kegiatanHariIni = await MasterJadwalKegiatan.findAll({
            where: {
                tanggal_kegiatan: today
            },
            order: [['jam_mulai', 'ASC']]
        });


        // === DEVICE & SECURITY ===
        const pendingDeviceResets = await DeviceResetRequest.count({ 
            where: { status: 'pending' } 
        });


        // === RECENT ATTENDANCE TODAY ===
        const recentAttendanceToday = await Kehadiran.findAll({
            where: { 
                absen_tgl: today 
            },
            include: [
                {
                    model: User,
                    attributes: ['username', 'email'],
                    required: false
                },
                {
                    model: Lokasi,
                    attributes: ['ket', 'lat', 'lng'],
                    required: false
                }
            ],
            order: [['absen_tgljam', 'DESC']],
            limit: 10,
            attributes: ['absen_id', 'absen_nip', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });


        const todayByCategory = await Kehadiran.findAll({
            where: { absen_tgl: today },
            attributes: [
                'absen_kat',
                [Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'count']
            ],
            group: ['absen_kat']
        });

        // Format category stats
        const categoryStats = {};
        todayByCategory.forEach(cat => {
            categoryStats[cat.absen_kat] = parseInt(cat.dataValues.count);
        });

        // === ALL KEHADIRAN WITH FILTERING ===
        // Build where clause untuk Kehadiran
        let whereClause = {};

        // Filter by tanggal
        if (startDate && endDate) {
            whereClause.absen_tgl = {
                [Op.between]: [startDate, endDate]
            };
        } else if (startDate) {
            whereClause.absen_tgl = {
                [Op.gte]: startDate
            };
        } else if (endDate) {
            whereClause.absen_tgl = {
                [Op.lte]: endDate
            };
        }

        // Filter by lokasi
        if (lokasi_id) {
            whereClause.lokasi_id = lokasi_id;
        }

        // Filter by status (status di sini adalah antara kolom absen_apel dan absen_sore)
        if (status) {
            const apelStatus = ['HAP', 'TAP'];
            const soreStatus = ['HAS', 'CP'];
            if (apelStatus.includes(status)) {
                whereClause.absen_apel = status;
            } else if (soreStatus.includes(status)) {
                whereClause.absen_sore = status;
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
        const { count, rows: allKehadiran } = await Kehadiran.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['username', 'email'],
                    where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
                    required: false
                },
                {
                    model: Lokasi,
                    attributes: ['lat', 'lng', 'ket'],
                    required: false
                }
            ],
            order: [
                ['absen_tgl', 'DESC']
            ],
            offset,
            limit,
            attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
        });

        res.status(200).json({
            success: true,
            data: {
                systemOverview: {
                    totalUsers
                },
                organizationalStatistics: {
                    totalSatker,
                    totalBidang,
                    totalSubBidang
                },
                kegiatanHariIni: kegiatanHariIni.length > 0 ? kegiatanHariIni.map(kegiatan => ({
                    id_kegiatan: kegiatan.id_kegiatan,
                    tanggal_kegiatan: kegiatan.tanggal_kegiatan,
                    jenis_kegiatan: kegiatan.jenis_kegiatan,
                    keterangan: kegiatan.keterangan,
                    jam_mulai: kegiatan.jam_mulai,
                    jam_selesai: kegiatan.jam_selesai,
                    include_absen: kegiatan.include_absen
                })) : [],
        
                kehadiranList: {
                    data: allKehadiran,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(count / limit),
                        totalItems: count,
                        itemsPerPage: limit
                    },
                },
            }
        });

    } catch (error) {
        console.error('Super Admin Dashboard Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    getSuperAdminDashboard
};
