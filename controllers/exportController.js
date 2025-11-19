const ExcelJS = require('exceljs');
const { Kehadiran, User, Lokasi } = require('../models/index');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');
const { mapUsersWithMasterData } = require('../utils/userMasterUtils');
const { getPegawaiByNip } = require('../utils/masterDbUtils');

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

        // Build where clause - use EXACT same format as kehadiran controller
        let whereClause = {};

        // Filter by tanggal - EXACT same as kehadiran controller
        whereClause.absen_tgl = {
            [Op.between]: [tanggal, tanggal]
        };

        // Filter by lokasi
        if (lokasi_id) {
            whereClause.lokasi_id = lokasi_id;
        }

        // Filter by status - EXACT same as kehadiran controller
        if (status) {
            const apelStatus = ['HAP', 'TAP'];
            const soreStatus = ['HAS', 'CP'];
            if (apelStatus.includes(status)) {
                whereClause.absen_apel = status;
            } else if (soreStatus.includes(status)) {
                whereClause.absen_sore = status;
            }
        }

        // Search by username, email, atau absen_nip - EXACT same as kehadiran controller
        let userWhere = {};
        if (search) {
            userWhere = {
                [Op.or]: [
                    { username: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } }
                ]
            };
            // EXACT same logic as kehadiran controller
            whereClause = {
                ...whereClause,
                [Op.or]: [
                    { absen_nip: { [Op.like]: `%${search}%` } },
                    whereClause
                ]
            };
        }

        // Debug: Log query parameters
        console.log('=== DEBUG EXPORT PRESENSI HARIAN ===');
        console.log('Query Parameters:', { tanggal, lokasi_id, search, status });
        console.log('Where Clause:', JSON.stringify(whereClause, null, 2));
        console.log('User Where:', JSON.stringify(userWhere, null, 2));
        
        // Debug: Test whereClause construction
        console.log('WhereClause absen_tgl:', whereClause.absen_tgl);

        // Debug: Check if there's any data for the date at all
        const totalCountForDate = await Kehadiran.count({
            where: { 
                absen_tgl: {
                    [Op.between]: [tanggal, tanggal]
                }
            }
        });
        console.log(`Total records for date ${tanggal}:`, totalCountForDate);

        // Debug: Check available dates in database
        const availableDates = await Kehadiran.findAll({
            attributes: [
                [Sequelize.fn('DISTINCT', Sequelize.col('absen_tgl')), 'absen_tgl']
            ],
            limit: 10,
            order: [['absen_tgl', 'DESC']]
        });
        console.log('Available dates in database:', availableDates.map(d => d.dataValues.absen_tgl));

        // Debug: Test exact same query as kehadiran controller
        console.log('Testing exact query from kehadiran controller...');
        const testQuery = await Kehadiran.findAll({
            where: {
                absen_tgl: {
                    [Op.between]: [tanggal, tanggal] // Same as startDate and endDate
                }
            },
            include: [
                {
                    model: User,
                    attributes: ['username', 'email', 'level'],
                    required: false
                },
                {
                    model: Lokasi,
                    attributes: ['ket', 'lat', 'lng'],
                    required: false
                }
            ],
            limit: 5
        });
        console.log('Test query results:', testQuery.length, 'records');
        if (testQuery.length > 0) {
            console.log('Test query sample:', JSON.stringify(testQuery[0].dataValues, null, 2));
        }

        // Debug: Check data types
        console.log('Tanggal parameter type:', typeof tanggal);
        console.log('Tanggal parameter value:', tanggal);
        
        // Debug: Raw SQL query test
        const rawQuery = await Kehadiran.sequelize.query(
            'SELECT * FROM kehadiran WHERE absen_tgl = ? LIMIT 5',
            {
                replacements: [tanggal],
                type: Sequelize.QueryTypes.SELECT
            }
        );
        console.log('Raw SQL query results:', rawQuery.length, 'records');
        if (rawQuery.length > 0) {
            console.log('Raw SQL sample:', JSON.stringify(rawQuery[0], null, 2));
        }

        // Get data presensi - use raw SQL since Sequelize has issues with Op.between
        let presensiData;
        
        try {
            // Try Sequelize first
            presensiData = await Kehadiran.findAll({
                where: whereClause,
                attributes: [
                    'absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam',
                    'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore',
                    'KDSATKER', 'BIDANGF', 'SUBF', 'NM_UNIT_KERJA', 'nama_jabatan'
                ],
                include: [
                    {
                        model: User,
                        attributes: ['username', 'email', 'level'],
                        where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
                        required: false
                    },
                    {
                        model: Lokasi,
                        attributes: ['ket', 'lat', 'lng'],
                        required: false
                    }
                ],
                order: [
                    ['absen_nip', 'ASC'],
                    ['absen_tgljam', 'ASC']
                ]
            });
            
            // Enrich dengan data master jika tidak ada data historis
            presensiData = await Promise.all(presensiData.map(async (item) => {
                const kehadiranData = item.toJSON();
                
                // Ambil data master jika tidak ada data historis
                let kdsatker = kehadiranData.KDSATKER;
                let bidangf = kehadiranData.BIDANGF;
                let subf = kehadiranData.SUBF;
                let nmUnitKerja = kehadiranData.NM_UNIT_KERJA;
                let namaJabatan = kehadiranData.nama_jabatan;
                
                // Jika tidak ada data historis, ambil dari master data
                if (!kdsatker || !bidangf || !subf || !nmUnitKerja || !namaJabatan) {
                    const pegawaiData = await getPegawaiByNip(kehadiranData.absen_nip);
                    if (pegawaiData) {
                        kdsatker = kdsatker || pegawaiData.KDSATKER || null;
                        bidangf = bidangf || pegawaiData.BIDANGF || null;
                        subf = subf || pegawaiData.SUBF || null;
                        nmUnitKerja = nmUnitKerja || pegawaiData.NM_UNIT_KERJA || null;
                        namaJabatan = namaJabatan || (pegawaiData.jabatan?.nama_jabatan) || null;
                    }
                }
                
                return {
                    dataValues: {
                        ...kehadiranData,
                        KDSATKER: kdsatker,
                        BIDANGF: bidangf,
                        SUBF: subf,
                        NM_UNIT_KERJA: nmUnitKerja,
                        nama_jabatan: namaJabatan
                    }
                };
            }));
            
            console.log('Sequelize query results:', presensiData.length);
            
            // If Sequelize fails, use raw SQL
            if (presensiData.length === 0) {
                console.log('Sequelize failed, using raw SQL...');
                
                let sqlQuery = `
                    SELECT k.*, u.username, u.email, u.level, l.ket, l.lat, l.lng
                    FROM kehadiran k
                    LEFT JOIN user u ON k.absen_nip = u.username
                    LEFT JOIN lokasi l ON k.lokasi_id = l.lokasi_id
                    WHERE k.absen_tgl = ?
                `;
                
                const sqlParams = [tanggal];
                
                if (lokasi_id) {
                    sqlQuery += ' AND k.lokasi_id = ?';
                    sqlParams.push(lokasi_id);
                }
                
                if (status) {
                    const apelStatus = ['HAP', 'TAP'];
                    const soreStatus = ['HAS', 'CP'];
                    if (apelStatus.includes(status)) {
                        sqlQuery += ' AND k.absen_apel = ?';
                        sqlParams.push(status);
                    } else if (soreStatus.includes(status)) {
                        sqlQuery += ' AND k.absen_sore = ?';
                        sqlParams.push(status);
                    }
                }
                
                if (search) {
                    sqlQuery += ' AND (k.absen_nip LIKE ? OR u.username LIKE ? OR u.email LIKE ?)';
                    const searchPattern = `%${search}%`;
                    sqlParams.push(searchPattern, searchPattern, searchPattern);
                }
                
                sqlQuery += ' ORDER BY k.absen_nip ASC, k.absen_tgljam ASC';
                
                const rawData = await Kehadiran.sequelize.query(sqlQuery, {
                    replacements: sqlParams,
                    type: Sequelize.QueryTypes.SELECT
                });
                
                console.log('Raw SQL query results:', rawData.length);
                
                // Convert raw data to Sequelize-like format
                const rawPresensiData = rawData.map(row => ({
                    dataValues: {
                        absen_id: row.absen_id,
                        absen_nip: row.absen_nip,
                        lokasi_id: row.lokasi_id,
                        absen_tgl: row.absen_tgl,
                        absen_tgljam: row.absen_tgljam,
                        absen_checkin: row.absen_checkin,
                        absen_checkout: row.absen_checkout,
                        absen_kat: row.absen_kat,
                        absen_apel: row.absen_apel,
                        absen_sore: row.absen_sore,
                        // Data historis dari tabel kehadiran
                        KDSATKER: row.KDSATKER || null,
                        BIDANGF: row.BIDANGF || null,
                        SUBF: row.SUBF || null,
                        NM_UNIT_KERJA: row.NM_UNIT_KERJA || null,
                        nama_jabatan: row.nama_jabatan || null,
                         User: row.username ? {
                            username: row.username,
                            email: row.email,
                            level: row.level
                        } : null,
                        Lokasi: row.ket ? {
                            ket: row.ket,
                            lat: row.lat,
                            lng: row.lng
                        } : null
                    }
                }));

                // Get master data for users
                const users = rawData.map(row => ({
                    username: row.username || row.absen_nip,
                    email: row.email || '',
                    level: row.level || ''
                }));

                // Map with master data
                const usersWithMasterData = await mapUsersWithMasterData(users);
                
                // Create master data map for quick lookup
                const masterDataMap = new Map();
                usersWithMasterData.forEach(user => {
                    masterDataMap.set(user.username, {
                        nama: user.nama,
                        email: user.email
                    });
                });

                // Combine presensi data with master data
                presensiData = await Promise.all(rawPresensiData.map(async (presensi) => {
                    const masterData = masterDataMap.get(presensi.dataValues.absen_nip);
                    
                    // Ambil data master jika tidak ada data historis
                    let kdsatker = presensi.dataValues.KDSATKER;
                    let bidangf = presensi.dataValues.BIDANGF;
                    let subf = presensi.dataValues.SUBF;
                    let nmUnitKerja = presensi.dataValues.NM_UNIT_KERJA;
                    let namaJabatan = presensi.dataValues.nama_jabatan;
                    
                    // Jika tidak ada data historis, ambil dari master data
                    if (!kdsatker || !bidangf || !subf || !nmUnitKerja || !namaJabatan) {
                        const pegawaiData = await getPegawaiByNip(presensi.dataValues.absen_nip);
                        if (pegawaiData) {
                            kdsatker = kdsatker || pegawaiData.KDSATKER || null;
                            bidangf = bidangf || pegawaiData.BIDANGF || null;
                            subf = subf || pegawaiData.SUBF || null;
                            nmUnitKerja = nmUnitKerja || pegawaiData.NM_UNIT_KERJA || null;
                            namaJabatan = namaJabatan || (pegawaiData.jabatan?.nama_jabatan) || null;
                        }
                    }
                    
                    return {
                        dataValues: {
                            ...presensi.dataValues,
                            KDSATKER: kdsatker,
                            BIDANGF: bidangf,
                            SUBF: subf,
                            NM_UNIT_KERJA: nmUnitKerja,
                            nama_jabatan: namaJabatan,
                            User: presensi.dataValues.User ? {
                                ...presensi.dataValues.User,
                                nama: masterData?.nama || presensi.dataValues.User.username,
                                email: masterData?.email || presensi.dataValues.User.email
                            } : null
                        }
                    };
                }));
                
                console.log('Converted raw data results:', presensiData.length);
            }
            
        } catch (error) {
            console.error('Query error:', error);
            presensiData = [];
        }

        // Debug: Log results
        console.log('Found presensi records:', presensiData.length);
        if (presensiData.length > 0) {
            console.log('Sample data:', JSON.stringify(presensiData[0].dataValues, null, 2));
        } else {
            console.log('No data found - checking raw query...');
            
            // Debug: Check raw data without filters
            const rawData = await Kehadiran.findAll({
                where: { absen_tgl: tanggal },
                limit: 5
            });
            console.log('Raw data for date:', rawData.length, 'records');
            if (rawData.length > 0) {
                console.log('Sample raw data:', JSON.stringify(rawData[0].dataValues, null, 2));
            }
        }

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
            { header: 'KDSATKER', key: 'kdsatker', width: 15 },
            { header: 'BIDANGF', key: 'bidangf', width: 15 },
            { header: 'SUBF', key: 'subf', width: 15 },
            { header: 'Nama Unit Kerja', key: 'nm_unit_kerja', width: 40 },
            { header: 'Jabatan', key: 'jabatan', width: 30 },
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

        // Debug: Log data before adding to Excel
        console.log('Adding data to Excel. Total rows:', presensiData.length);

        // Add data rows
        presensiData.forEach((presensi, index) => {
            // Handle both Sequelize objects and converted raw data
            const data = presensi.dataValues || presensi;
            
            const rowData = {
                no: index + 1,
                nip: data.absen_nip || '-',
                nama: data.User?.nama || data.User?.username || '-',
                email: data.User?.email || '-',
                level: data.User?.level || '-',
                kdsatker: data.KDSATKER || '-',
                bidangf: data.BIDANGF || '-',
                subf: data.SUBF || '-',
                nm_unit_kerja: data.NM_UNIT_KERJA || '-',
                jabatan: data.nama_jabatan || '-',
                tanggal: data.absen_tgl || '-',
                jam_absen: data.absen_tgljam ? new Date(data.absen_tgljam).toLocaleTimeString('id-ID') : '-',
                checkin: data.absen_checkin ? data.absen_checkin : '-',
                checkout: data.absen_checkout ? data.absen_checkout : '-',
                kategori: data.absen_kat || '-',
                apel_pagi: data.absen_apel || '-',
                apel_sore: data.absen_sore || '-',
                lokasi: data.Lokasi?.ket || '-',
                koordinat: data.Lokasi ? `${data.Lokasi.lat}, ${data.Lokasi.lng}` : '-'
            };
            
            // Debug: Log first few rows
            if (index < 3) {
                console.log(`Row ${index + 1}:`, rowData);
                console.log(`Raw presensi data:`, JSON.stringify(data, null, 2));
            }
            
            worksheet.addRow(rowData);
        });

        // Debug: Log final summary
        console.log('Excel generation completed. Total rows added:', presensiData.length);

        // If no data found, add a message
        if (presensiData.length === 0) {
            worksheet.addRow({
                no: 1,
                nip: '-',
                nama: 'TIDAK ADA DATA',
                email: 'Untuk tanggal yang dipilih',
                level: '-',
                kdsatker: '-',
                bidangf: '-',
                subf: '-',
                nm_unit_kerja: '-',
                jabatan: '-',
                tanggal: '-',
                jam_absen: '-',
                checkin: '-',
                checkout: '-',
                kategori: '-',
                apel_pagi: '-',
                apel_sore: '-',
                lokasi: '-',
                koordinat: '-'
            });
            
            // Style the "no data" row
            const noDataRow = worksheet.getRow(2);
            noDataRow.font = { italic: true, color: { argb: 'FF666666' } };
            noDataRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF5F5F5' }
            };
        }

        // Add summary info
        const summaryRow = presensiData.length === 0 ? 4 : presensiData.length + 3;
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

        // Get attendance data - try Sequelize first, fallback to raw SQL if needed
        let presensiData;
        
        try {
            // Try Sequelize first
            presensiData = await Kehadiran.findAll({
                where: whereClause,
                include: [
                    {
                        model: User,
                        attributes: ['username', 'email', 'level'],
                        required: false
                    },
                    {
                        model: Lokasi,
                        attributes: ['ket', 'lat', 'lng'],
                        required: false
                    }
                ],
                order: [
                    ['absen_tgl', 'ASC'],
                    ['absen_nip', 'ASC']
                ]
            });
            
            console.log('Sequelize query results for monthly:', presensiData.length);
            
            // If Sequelize fails, use raw SQL
            if (presensiData.length === 0) {
                console.log('Sequelize failed for monthly, using raw SQL...');
                
                let sqlQuery = `
                    SELECT k.*, u.username, u.email, u.level, l.ket, l.lat, l.lng
                    FROM kehadiran k
                    LEFT JOIN user u ON k.absen_nip = u.username
                    LEFT JOIN lokasi l ON k.lokasi_id = l.lokasi_id
                    WHERE k.absen_tgl BETWEEN ? AND ?
                `;
                
                const sqlParams = [startDate, endDate];
                
                if (lokasi_id) {
                    sqlQuery += ' AND k.lokasi_id = ?';
                    sqlParams.push(lokasi_id);
                }
                
                if (user_id) {
                    sqlQuery += ' AND k.absen_nip = ?';
                    sqlParams.push(user_id);
                }
                
                sqlQuery += ' ORDER BY k.absen_tgl ASC, k.absen_nip ASC';
                
                const rawData = await Kehadiran.sequelize.query(sqlQuery, {
                    replacements: sqlParams,
                    type: Sequelize.QueryTypes.SELECT
                });
                
                console.log('Raw SQL query results for monthly:', rawData.length);
                
                // Convert raw data to Sequelize-like format
                const rawPresensiData = rawData.map(row => ({
                    absen_id: row.absen_id,
                    absen_nip: row.absen_nip,
                    lokasi_id: row.lokasi_id,
                    absen_tgl: row.absen_tgl,
                    absen_tgljam: row.absen_tgljam,
                    absen_checkin: row.absen_checkin,
                    absen_checkout: row.absen_checkout,
                    absen_kat: row.absen_kat,
                    absen_apel: row.absen_apel,
                    absen_sore: row.absen_sore,
                    User: row.username ? {
                        username: row.username,
                        email: row.email,
                        level: row.level
                    } : null,
                    Lokasi: row.ket ? {
                        ket: row.ket,
                        lat: row.lat,
                        lng: row.lng
                    } : null
                }));

                // Get master data for users
                const users = rawData.map(row => ({
                    username: row.username || row.absen_nip,
                    email: row.email || '',
                    level: row.level || ''
                }));

                // Map with master data
                const usersWithMasterData = await mapUsersWithMasterData(users);
                
                // Create master data map for quick lookup
                const masterDataMap = new Map();
                usersWithMasterData.forEach(user => {
                    masterDataMap.set(user.username, {
                        nama: user.nama,
                        email: user.email
                    });
                });

                // Combine presensi data with master data
                presensiData = rawPresensiData.map(presensi => {
                    const masterData = masterDataMap.get(presensi.absen_nip);
                    return {
                        ...presensi,
                        User: presensi.User ? {
                            ...presensi.User,
                            nama: masterData?.nama || presensi.User.username,
                            email: masterData?.email || presensi.User.email
                        } : null
                    };
                });
                
                console.log('Converted raw data results for monthly:', presensiData.length);
            } else {
                // If Sequelize worked, still need to enrich with master data
                const users = presensiData.map(presensi => ({
                    username: presensi.User?.username || presensi.absen_nip,
                    email: presensi.User?.email || '',
                    level: presensi.User?.level || ''
                }));

                // Map with master data
                const usersWithMasterData = await mapUsersWithMasterData(users);
                
                // Create master data map for quick lookup
                const masterDataMap = new Map();
                usersWithMasterData.forEach(user => {
                    masterDataMap.set(user.username, {
                        nama: user.nama,
                        email: user.email
                    });
                });

                // Enrich presensi data with master data
                presensiData = presensiData.map(presensi => {
                    const masterData = masterDataMap.get(presensi.absen_nip);
                    if (presensi.User && masterData) {
                        presensi.User.nama = masterData.nama;
                        presensi.User.email = masterData.email;
                    }
                    return presensi;
                });
            }
            
        } catch (error) {
            console.error('Query error for monthly:', error);
            presensiData = [];
        }

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
                nama: presensi.User?.nama || presensi.User?.username || '-',
                email: presensi.User?.email || '-',
                level: presensi.User?.level || '-',
                tanggal: presensi.absen_tgl,
                jam_absen: presensi.absen_tgljam ? new Date(presensi.absen_tgljam).toLocaleTimeString('id-ID') : '-',
                checkin: presensi.absen_checkin ? presensi.absen_checkin : '-',
                checkout: presensi.absen_checkout ? presensi.absen_checkout : '-',
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

/**
 * Debug endpoint untuk test export presensi harian
 */
const debugExportHarian = async (req, res) => {
    try {
        const { tanggal } = req.query;

        if (!tanggal) {
            return res.status(400).json({ 
                success: false, 
                error: 'Parameter tanggal wajib diisi' 
            });
        }

        // Check total data for date
        const totalCount = await Kehadiran.count({
            where: { 
                absen_tgl: {
                    [Op.between]: [tanggal, tanggal]
                }
            }
        });

        // Get sample data
        const sampleData = await Kehadiran.findAll({
            where: { 
                absen_tgl: {
                    [Op.between]: [tanggal, tanggal]
                }
            },
            limit: 5,
            include: [
                {
                    model: User,
                    attributes: ['username', 'email', 'level'],
                    required: false
                },
                {
                    model: Lokasi,
                    attributes: ['ket', 'lat', 'lng'],
                    required: false
                }
            ]
        });

        // Get available dates
        const availableDates = await Kehadiran.findAll({
            attributes: [
                [Sequelize.fn('DISTINCT', Sequelize.col('absen_tgl')), 'absen_tgl']
            ],
            limit: 10,
            order: [['absen_tgl', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                requestedDate: tanggal,
                totalRecords: totalCount,
                sampleData: sampleData.map(p => ({
                    absen_nip: p.absen_nip,
                    absen_tgl: p.absen_tgl,
                    absen_tgljam: p.absen_tgljam,
                    absen_kat: p.absen_kat,
                    absen_apel: p.absen_apel,
                    absen_sore: p.absen_sore,
                    user: p.User ? {
                        username: p.User.username,
                        email: p.User.email,
                        level: p.User.level
                    } : null,
                    lokasi: p.Lokasi ? {
                        ket: p.Lokasi.ket,
                        lat: p.Lokasi.lat,
                        lng: p.Lokasi.lng
                    } : null
                })),
                availableDates: availableDates.map(d => d.dataValues.absen_tgl)
            }
        });

    } catch (error) {
        console.error('Debug Export Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Gagal debug export',
            message: error.message 
        });
    }
};

module.exports = {
    exportPresensiHarian,
    exportPresensiBulanan,
    debugExportHarian
};
