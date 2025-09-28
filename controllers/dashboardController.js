const { 
    User, 
    Kehadiran, 
    Lokasi, 
    DeviceResetRequest,
    SkpdTbl,
    SatkerTbl,
    BidangTbl
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

        // === MASTER DATA STATISTICS ===
        const totalSkpd = await SkpdTbl.count();
        const totalSatker = await SatkerTbl.count();
        const totalBidang = await BidangTbl.count();

        // === LOCATION STATISTICS ===
        const totalLocations = await Lokasi.count();
        const activeLocations = await Lokasi.count({ where: { status: true } });
        const inactiveLocations = await Lokasi.count({ where: { status: false } });

        // === DEVICE & SECURITY ===
        const pendingDeviceResets = await DeviceResetRequest.count({ 
            where: { status: 'pending' } 
        });


        // === RECENT ATTENDANCE TODAY ===
        const today = getTodayDate();
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
                masterDataStatistics: {
                    totalSkpd,
                    totalSatker,
                    totalBidang
                },
                locationStatistics: {
                    totalLocations,
                    activeLocations,
                    inactiveLocations,
                },
        
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
