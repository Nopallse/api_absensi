const ExcelJS = require('exceljs');
const { Kehadiran, User, Lokasi } = require('../models/index');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');

/**
 * Export presensi harian ke Excel
 */
const exportPresensiHarian = async (req, res) => {
    try {
        const { 
            tanggal, 
            lokasi_id,
            search,
            status
        } = req.query;

        // Validasi parameter wajib
        if (!tanggal) {
            return res.status(400).json({ 
                success: false, 
                error: 'Parameter tanggal wajib diisi' 
            });
        }

        // Build where clause
        let whereClause = {
            absen_tgl: tanggal
        };

        // Filter by lokasi
        if (lokasi_id) {
            whereClause.lokasi_id = lokasi_id;
        }

        // Filter by status
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
            whereClause = {
                ...whereClause,
                [Op.or]: [
                    { absen_nip: { [Op.like]: `%${search}%` } },
                    whereClause
                ]
            };
        }

        // Get data presensi
        const presensiData = await Kehadiran.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['username', 'email', 'level'],
                    where: Object.keys(userWhere).length > 0 ? userWhere : undefined
                },
                {
                    model: Lokasi,
                    attributes: ['ket', 'lat', 'lng']
                }
            ],
            order: [
                ['absen_nip', 'ASC'],
                ['absen_tgljam', 'ASC']
            ]
        });

        // Get lokasi info untuk header
        let lokasiInfo = '';
        if (lokasi_id) {
            const lokasi = await Lokasi.findByPk(lokasi_id);
            if (lokasi) {
                lokasiInfo = lokasi.ket;
            }
        }

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Presensi Harian');

        // Set column headers
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'NIP', key: 'nip', width: 20 },
            { header: 'Nama', key: 'nama', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Level', key: 'level', width: 10 },
            { header: 'Tanggal', key: 'tanggal', width: 15 },
            { header: 'Jam Absen', key: 'jam_absen', width: 15 },
            { header: 'Check In', key: 'checkin', width: 15 },
            { header: 'Check Out', key: 'checkout', width: 15 },
            { header: 'Kategori', key: 'kategori', width: 15 },
            { header: 'Apel Pagi', key: 'apel_pagi', width: 15 },
            { header: 'Apel Sore', key: 'apel_sore', width: 15 },
            { header: 'Lokasi', key: 'lokasi', width: 30 },
            { header: 'Koordinat', key: 'koordinat', width: 25 }
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        presensiData.forEach((presensi, index) => {
            worksheet.addRow({
                no: index + 1,
                nip: presensi.absen_nip,
                nama: presensi.User?.username || '-',
                email: presensi.User?.email || '-',
                level: presensi.User?.level || '-',
                tanggal: presensi.absen_tgl,
                jam_absen: presensi.absen_tgljam ? new Date(presensi.absen_tgljam).toLocaleTimeString('id-ID') : '-',
                checkin: presensi.absen_checkin ? new Date(presensi.absen_checkin).toLocaleTimeString('id-ID') : '-',
                checkout: presensi.absen_checkout ? new Date(presensi.absen_checkout).toLocaleTimeString('id-ID') : '-',
                kategori: presensi.absen_kat || '-',
                apel_pagi: presensi.absen_apel || '-',
                apel_sore: presensi.absen_sore || '-',
                lokasi: presensi.Lokasi?.ket || '-',
                koordinat: presensi.Lokasi ? `${presensi.Lokasi.lat}, ${presensi.Lokasi.lng}` : '-'
            });
        });

        // Add summary info
        const summaryRow = presensiData.length + 3;
        worksheet.getCell(`A${summaryRow}`).value = 'RINGKASAN';
        worksheet.getCell(`A${summaryRow}`).font = { bold: true };
        
        worksheet.getCell(`A${summaryRow + 1}`).value = 'Tanggal:';
        worksheet.getCell(`B${summaryRow + 1}`).value = tanggal;
        
        worksheet.getCell(`A${summaryRow + 2}`).value = 'Lokasi:';
        worksheet.getCell(`B${summaryRow + 2}`).value = lokasiInfo || 'Semua Lokasi';
        
        worksheet.getCell(`A${summaryRow + 3}`).value = 'Total Data:';
        worksheet.getCell(`B${summaryRow + 3}`).value = presensiData.length;

        // Set response headers
        const filename = `Presensi_Harian_${tanggal.replace(/-/g, '_')}${lokasi_id ? `_${lokasiInfo.replace(/\s+/g, '_')}` : ''}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Presensi Harian Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal export presensi harian',
            message: error.message 
        });
    }
};

/**
 * Export presensi bulanan ke Excel
 */
const exportPresensiBulanan = async (req, res) => {
    try {
        const { 
            year = new Date().getFullYear(), 
            month = new Date().getMonth() + 1,
            lokasi_id,
            user_id
        } = req.query;

        // Validasi parameter
        const selectedYear = parseInt(year);
        const selectedMonth = parseInt(month);
        
        if (selectedYear < 2020 || selectedYear > 2030) {
            return res.status(400).json({ 
                success: false, 
                error: 'Tahun tidak valid' 
            });
        }
        
        if (selectedMonth < 1 || selectedMonth > 12) {
            return res.status(400).json({ 
                success: false, 
                error: 'Bulan tidak valid' 
            });
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

        // Add user filter if provided
        if (user_id) {
            whereClause.absen_nip = user_id;
        }

        // Get attendance data
        const presensiData = await Kehadiran.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    attributes: ['username', 'email', 'level']
                },
                {
                    model: Lokasi,
                    attributes: ['ket', 'lat', 'lng']
                }
            ],
            order: [
                ['absen_tgl', 'ASC'],
                ['absen_nip', 'ASC']
            ]
        });

        // Get lokasi info untuk header
        let lokasiInfo = '';
        if (lokasi_id) {
            const lokasi = await Lokasi.findByPk(lokasi_id);
            if (lokasi) {
                lokasiInfo = lokasi.ket;
            }
        }

        // Get summary statistics
        const summaryStats = await Kehadiran.findAll({
            where: whereClause,
            attributes: [
                'absen_kat',
                [Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'count']
            ],
            group: ['absen_kat']
        });

        // Get apel statistics
        const apelStats = await Kehadiran.findAll({
            where: {
                ...whereClause,
                absen_apel: {
                    [Op.not]: null
                }
            },
            attributes: [
                'absen_apel',
                [Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'count']
            ],
            group: ['absen_apel']
        });

        // Get sore statistics
        const soreStats = await Kehadiran.findAll({
            where: {
                ...whereClause,
                absen_sore: {
                    [Op.not]: null
                }
            },
            attributes: [
                'absen_sore',
                [Sequelize.fn('COUNT', Sequelize.col('absen_id')), 'count']
            ],
            group: ['absen_sore']
        });

        // Process summary statistics
        const stats = {
            total: 0,
            HADIR: 0,
            HAP: 0,  // Hadir Apel Pagi
            TAP: 0,  // Telat Apel Pagi
            HAS: 0,  // Hadir Apel Sore
            CP: 0    // Cepat Pulang
        };

        // Process absen_kat statistics
        summaryStats.forEach(stat => {
            const category = stat.absen_kat;
            const count = parseInt(stat.dataValues.count);
            stats.total += count;
            
            if (stats.hasOwnProperty(category)) {
                stats[category] = count;
            }
        });

        // Process absen_apel statistics
        apelStats.forEach(stat => {
            const apelStatus = stat.absen_apel;
            const count = parseInt(stat.dataValues.count);
            
            if (stats.hasOwnProperty(apelStatus)) {
                stats[apelStatus] = count;
            }
        });

        // Process absen_sore statistics
        soreStats.forEach(stat => {
            const soreStatus = stat.absen_sore;
            const count = parseInt(stat.dataValues.count);
            
            if (stats.hasOwnProperty(soreStatus)) {
                stats[soreStatus] = count;
            }
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        
        // Sheet 1: Data Presensi
        const dataSheet = workbook.addWorksheet('Data Presensi');
        
        // Set column headers
        dataSheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'NIP', key: 'nip', width: 20 },
            { header: 'Nama', key: 'nama', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Level', key: 'level', width: 10 },
            { header: 'Tanggal', key: 'tanggal', width: 15 },
            { header: 'Jam Absen', key: 'jam_absen', width: 15 },
            { header: 'Check In', key: 'checkin', width: 15 },
            { header: 'Check Out', key: 'checkout', width: 15 },
            { header: 'Kategori', key: 'kategori', width: 15 },
            { header: 'Apel Pagi', key: 'apel_pagi', width: 15 },
            { header: 'Apel Sore', key: 'apel_sore', width: 15 },
            { header: 'Lokasi', key: 'lokasi', width: 30 },
            { header: 'Koordinat', key: 'koordinat', width: 25 }
        ];

        // Style header
        dataSheet.getRow(1).font = { bold: true };
        dataSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        presensiData.forEach((presensi, index) => {
            dataSheet.addRow({
                no: index + 1,
                nip: presensi.absen_nip,
                nama: presensi.User?.username || '-',
                email: presensi.User?.email || '-',
                level: presensi.User?.level || '-',
                tanggal: presensi.absen_tgl,
                jam_absen: presensi.absen_tgljam ? new Date(presensi.absen_tgljam).toLocaleTimeString('id-ID') : '-',
                checkin: presensi.absen_checkin ? new Date(presensi.absen_checkin).toLocaleTimeString('id-ID') : '-',
                checkout: presensi.absen_checkout ? new Date(presensi.absen_checkout).toLocaleTimeString('id-ID') : '-',
                kategori: presensi.absen_kat || '-',
                apel_pagi: presensi.absen_apel || '-',
                apel_sore: presensi.absen_sore || '-',
                lokasi: presensi.Lokasi?.ket || '-',
                koordinat: presensi.Lokasi ? `${presensi.Lokasi.lat}, ${presensi.Lokasi.lng}` : '-'
            });
        });

        // Sheet 2: Ringkasan Statistik
        const summarySheet = workbook.addWorksheet('Ringkasan Statistik');
        
        // Add summary info
        summarySheet.getCell('A1').value = 'RINGKASAN PRESENSI BULANAN';
        summarySheet.getCell('A1').font = { bold: true, size: 16 };
        
        summarySheet.getCell('A3').value = 'Periode:';
        summarySheet.getCell('B3').value = `${selectedMonth}/${selectedYear}`;
        
        summarySheet.getCell('A4').value = 'Lokasi:';
        summarySheet.getCell('B4').value = lokasiInfo || 'Semua Lokasi';
        
        summarySheet.getCell('A5').value = 'Total Data:';
        summarySheet.getCell('B5').value = presensiData.length;

        // Add statistics table
        const statsStartRow = 7;
        summarySheet.getCell(`A${statsStartRow}`).value = 'STATISTIK KEHADIRAN';
        summarySheet.getCell(`A${statsStartRow}`).font = { bold: true, size: 14 };

        const statsData = [
            ['Kategori', 'Jumlah'],
            ['Total Kehadiran', stats.total],
            ['Hadir', stats.HADIR],
            ['Hadir Apel Pagi (HAP)', stats.HAP],
            ['Telat Apel Pagi (TAP)', stats.TAP],
            ['Hadir Apel Sore (HAS)', stats.HAS],
            ['Cepat Pulang (CP)', stats.CP]
        ];

        statsData.forEach((row, index) => {
            summarySheet.getCell(`A${statsStartRow + 2 + index}`).value = row[0];
            summarySheet.getCell(`B${statsStartRow + 2 + index}`).value = row[1];
            
            if (index === 0) {
                summarySheet.getCell(`A${statsStartRow + 2 + index}`).font = { bold: true };
                summarySheet.getCell(`B${statsStartRow + 2 + index}`).font = { bold: true };
            }
        });

        // Set response headers
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const filename = `Presensi_Bulanan_${monthNames[selectedMonth - 1]}_${selectedYear}${lokasi_id ? `_${lokasiInfo.replace(/\s+/g, '_')}` : ''}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Presensi Bulanan Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal export presensi bulanan',
            message: error.message 
        });
    }
};

module.exports = {
    exportPresensiHarian,
    exportPresensiBulanan
};
