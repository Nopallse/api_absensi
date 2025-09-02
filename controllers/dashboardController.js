const { User, Kehadiran, Lokasi, Ketidakhadiran, PermohonanTerlambat } = require('../models');
const Sequelize = require('sequelize');
const { Op } = Sequelize;
const {
    getWIBDate,
    getTodayDate,
    getMonthRange,
    getWeekRange,
    getDayName
} = require('../utils/timeUtils');



// Dashboard utama admin
const getDashboardOverview = async (req, res) => {
    try {


        const today = getTodayDate();
        const { startDate, endDate } = getMonthRange();

        // Statistik user
        const totalUsers = await User.count();
        const activeUsers = await User.count({ where: { status: true } });
        const inactiveUsers = await User.count({ where: { status: false } });

        // Statistik kehadiran hari ini
        const todayAttendance = await Kehadiran.count({
            where: { absen_tgl: today }
        });

        const todayPresent = await Kehadiran.count({
            where: { 
                absen_tgl: today,
                absen_kat: 'hadir'
            }
        });

        const todayLate = await Kehadiran.count({
            where: { 
                absen_tgl: today,
                absen_kat: 'telat'
            }
        });

        const todayAbsent = await Kehadiran.count({
            where: { 
                absen_tgl: today,
                absen_kat: { [Op.in]: ['izin', 'sakit', 'cuti', 'dinas'] }
            }
        });

        // Statistik kehadiran bulan ini
        const monthAttendance = await Kehadiran.count({
            where: {
                absen_tgl: {
                    [Op.between]: [startDate, endDate]
                }
            }
        });

        const monthPresent = await Kehadiran.count({
            where: {
                absen_tgl: {
                    [Op.between]: [startDate, endDate]
                },
                absen_kat: 'hadir'
            }
        });

        const monthLate = await Kehadiran.count({
            where: {
                absen_tgl: {
                    [Op.between]: [startDate, endDate]
                },
                absen_kat: 'telat'
            }
        });

        // Statistik ketidakhadiran
        const pendingAbsence = await Ketidakhadiran.count({
            where: { status: 'pending' }
        });

        const approvedAbsence = await Ketidakhadiran.count({
            where: { status: 'approved' }
        });

        const rejectedAbsence = await Ketidakhadiran.count({
            where: { status: 'rejected' }
        });

        // Statistik permohonan terlambat
        const pendingLateness = await PermohonanTerlambat.count({
            where: { status: 'pending' }
        });

        const approvedLateness = await PermohonanTerlambat.count({
            where: { status: 'approved' }
        });

        const rejectedLateness = await PermohonanTerlambat.count({
            where: { status: 'rejected' }
        });

        // Statistik lokasi
        const totalLocations = await Lokasi.count();
        const activeLocations = await Lokasi.count({ where: { status: true } });

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    activeUsers,
                    inactiveUsers,
                    totalLocations,
                    activeLocations
                },
                todayStats: {
                    totalAttendance: todayAttendance,
                    present: todayPresent,
                    late: todayLate,
                    absent: todayAbsent,
                    attendanceRate: totalUsers > 0 ? Math.round((todayAttendance / totalUsers) * 100) : 0
                },
                monthStats: {
                    totalAttendance: monthAttendance,
                    present: monthPresent,
                    late: monthLate,
                    averageDaily: Math.round(monthAttendance / new Date().getDate())
                },
                absenceStats: {
                    pending: pendingAbsence,
                    approved: approvedAbsence,
                    rejected: rejectedAbsence
                },
                latenessStats: {
                    pending: pendingLateness,
                    approved: approvedLateness,
                    rejected: rejectedLateness
                }
            }
        });
    } catch (error) {
        console.error('Dashboard Overview Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Statistik kehadiran per hari dalam seminggu
const getWeeklyAttendanceStats = async (req, res) => {
    try {


        const { startDate, endDate } = getWeekRange();

        const weeklyStats = await Kehadiran.findAll({
            where: {
                absen_tgl: {
                    [Op.between]: [startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]]
                }
            },
            attributes: [
                'absen_tgl',
                'absen_kat',
                [Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'count']
            ],
            group: ['absen_tgl', 'absen_kat'],
            order: [['absen_tgl', 'ASC']]
        });

        // Format data untuk response
        const formattedStats = [];

        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(new Date(startDate).getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            const dayStats = weeklyStats.filter(stat => stat.absen_tgl === dateStr);
            
            formattedStats.push({
                day: getDayName(currentDate),
                date: dateStr,
                present: dayStats.find(stat => stat.absen_kat === 'hadir')?.dataValues.count || 0,
                late: dayStats.find(stat => stat.absen_kat === 'telat')?.dataValues.count || 0,
                absent: dayStats.filter(stat => ['izin', 'sakit', 'cuti', 'dinas'].includes(stat.absen_kat))
                    .reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0)
            });
        }

        res.status(200).json({
            success: true,
            data: formattedStats
        });
    } catch (error) {
        console.error('Weekly Attendance Stats Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Top 10 user dengan kehadiran terbaik bulan ini
const getTopAttendanceUsers = async (req, res) => {
    try {


        const { startDate, endDate } = getMonthRange();

        const topUsers = await Kehadiran.findAll({
            where: {
                absen_tgl: {
                    [Op.between]: [startDate, endDate]
                },
                absen_kat: { [Op.in]: ['hadir', 'telat'] }
            },
            include: [{
                model: User,
                attributes: ['id', 'username', 'email', 'level']
            }],
            attributes: [
                'absen_nip',
                [Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'attendance_count'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'hadir' THEN 1 ELSE 0 END")), 'present_count'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'telat' THEN 1 ELSE 0 END")), 'late_count']
            ],
            group: ['absen_nip', 'User.id', 'User.username', 'User.email', 'User.level'],
            order: [[Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'DESC']],
            limit: 10
        });

        const formattedTopUsers = topUsers.map(user => ({
            user: user.User,
            attendanceCount: parseInt(user.dataValues.attendance_count),
            presentCount: parseInt(user.dataValues.present_count),
            lateCount: parseInt(user.dataValues.late_count),
            attendanceRate: Math.round((parseInt(user.dataValues.present_count) / parseInt(user.dataValues.attendance_count)) * 100)
        }));

        res.status(200).json({
            success: true,
            data: formattedTopUsers
        });
    } catch (error) {
        console.error('Top Attendance Users Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Statistik kehadiran per lokasi
const getLocationAttendanceStats = async (req, res) => {
    try {


        const { startDate, endDate } = getMonthRange();

        const locationStats = await Kehadiran.findAll({
            where: {
                absen_tgl: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [{
                model: Lokasi,
                attributes: ['lokasi_id', 'ket', 'lat', 'lng']
            }],
            attributes: [
                'lokasi_id',
                [Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'total_attendance'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'hadir' THEN 1 ELSE 0 END")), 'present_count'],
                [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN absen_kat = 'telat' THEN 1 ELSE 0 END")), 'late_count']
            ],
            group: ['lokasi_id', 'Lokasi.lokasi_id', 'Lokasi.ket', 'Lokasi.lat', 'Lokasi.lng'],
            order: [[Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'DESC']]
        });

        const formattedLocationStats = locationStats.map(location => ({
            location: location.Lokasi,
            totalAttendance: parseInt(location.dataValues.total_attendance),
            presentCount: parseInt(location.dataValues.present_count),
            lateCount: parseInt(location.dataValues.late_count),
            attendanceRate: Math.round((parseInt(location.dataValues.present_count) / parseInt(location.dataValues.total_attendance)) * 100)
        }));

        res.status(200).json({
            success: true,
            data: formattedLocationStats
        });
    } catch (error) {
        console.error('Location Attendance Stats Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Statistik real-time hari ini
const getTodayRealTimeStats = async (req, res) => {
        try {


        const today = getTodayDate();
        const now = new Date();
        const currentHour = now.getHours();

        // Kehadiran per jam hari ini
        const hourlyStats = await Kehadiran.findAll({
            where: {
                absen_tgl: today,
                absen_checkin: {
                    [Op.not]: null
                }
            },
            attributes: [
                [Sequelize.fn('HOUR', Sequelize.col('absen_checkin')), 'hour'],
                [Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'count']
            ],
            group: [Sequelize.fn('HOUR', Sequelize.col('absen_checkin'))],
            order: [[Sequelize.fn('HOUR', Sequelize.col('absen_checkin')), 'ASC']]
        });

        // Kehadiran terbaru (5 menit terakhir)
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const recentAttendance = await Kehadiran.findAll({
            where: {
                absen_tgl: today,
                absen_tgljam: {
                    [Op.gte]: fiveMinutesAgo
                }
            },
            include: [{
                model: User,
                attributes: ['username', 'email']
            }],
            order: [['absen_tgljam', 'DESC']],
            limit: 10
        });

        // Total kehadiran hari ini
        const todayTotal = await Kehadiran.count({
            where: { absen_tgl: today }
        });

        // Kehadiran yang belum checkout
        const notCheckedOut = await Kehadiran.count({
            where: {
                absen_tgl: today,
                absen_checkin: { [Op.not]: null },
                absen_checkout: null
            }
        });

        res.status(200).json({
            success: true,
            data: {
                currentTime: now.toISOString(),
                todayTotal,
                notCheckedOut,
                hourlyStats: hourlyStats.map(stat => ({
                    hour: parseInt(stat.dataValues.hour),
                    count: parseInt(stat.dataValues.count)
                })),
                recentAttendance: recentAttendance.map(att => ({
                    id: att.absen_id,
                    user: att.User.username,
                    checkin: att.absen_checkin,
                    category: att.absen_kat,
                    timestamp: att.absen_tgljam
                }))
            }
        });
    } catch (error) {
        console.error('Today Real Time Stats Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getDashboardOverview,
    getWeeklyAttendanceStats,
    getTopAttendanceUsers,
    getLocationAttendanceStats,
    getTodayRealTimeStats
}; 