const { JamDinas, JamDinasDetail, DinasSetjam } = require('../models');
const { isValidTimeFormat } = require('../utils/timeUtils');

// Get all jam dinas
const getAllJamDinas = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const jamDinasList = await JamDinas.findAndCountAll({
            include: [
                {
                    model: JamDinasDetail,
                    as: 'details'
                }
            ],
            limit,
            offset,
            order: [['id', 'ASC']]
        });

        const totalPages = Math.ceil(jamDinasList.count / limit);

        res.json({
            success: true,
            data: jamDinasList.rows,
            pagination: {
                totalItems: jamDinasList.count,
                totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get All Jam Dinas Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Get jam dinas by ID
const getJamDinasById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const jamDinas = await JamDinas.findByPk(id, {
            include: [
                {
                    model: JamDinasDetail,
                    as: 'details'
                },
                {
                    model: DinasSetjam,
                    as: 'assignments'
                }
            ]
        });
        
        if (!jamDinas) {
            return res.status(404).json({ 
                success: false,
                message: "Jam dinas tidak ditemukans" 
            });
        }
        
        res.json({
            success: true,
            data: jamDinas
        });
    } catch (error) {
        console.error('Get Jam Dinas By ID Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Create jam dinas
const createJamDinas = async (req, res) => {
    try {
        const { nama, hari_kerja, menit, status = 1 } = req.body;
        
        // Validasi input
        if (!nama || !hari_kerja || !menit) {
            return res.status(400).json({ 
                success: false,
                message: "Nama, hari kerja, dan menit wajib diisi" 
            });
        }
        
        // Validasi hari_kerja
        if (hari_kerja < 1 || hari_kerja > 7) {
            return res.status(400).json({ 
                success: false,
                message: "Hari kerja harus antara 1-7" 
            });
        }
        
        // Create jam dinas
        const jamDinas = await JamDinas.create({
            nama,
            hari_kerja,
            menit,
            status
        });
        
        res.status(201).json({
            success: true,
            message: "Jam dinas berhasil dibuat",
            data: jamDinas
        });
    } catch (error) {
        console.error('Create Jam Dinas Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Update jam dinas
const updateJamDinas = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, hari_kerja, menit, status } = req.body;
        
        const jamDinas = await JamDinas.findByPk(id);
        
        if (!jamDinas) {
            return res.status(404).json({ 
                success: false,
                message: "Jam dinas tidak ditemukan" 
            });
        }
        
        // Validasi hari_kerja jika diupdate
        if (hari_kerja !== undefined && (hari_kerja < 1 || hari_kerja > 7)) {
            return res.status(400).json({ 
                success: false,
                message: "Hari kerja harus antara 1-7" 
            });
        }
        
        await jamDinas.update({
            nama: nama || jamDinas.nama,
            hari_kerja: hari_kerja || jamDinas.hari_kerja,
            menit: menit || jamDinas.menit,
            status: status !== undefined ? status : jamDinas.status
        });
        
        res.json({
            success: true,
            message: "Jam dinas berhasil diperbarui",
            data: jamDinas
        });
    } catch (error) {
        console.error('Update Jam Dinas Error:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to update jam dinas"
        });
    }
};

// Delete jam dinas
const deleteJamDinas = async (req, res) => {
    try {
        const { id } = req.params;
        
        const jamDinas = await JamDinas.findByPk(id);
        
        if (!jamDinas) {
            return res.status(404).json({ 
                success: false,
                error: "Jam dinas tidak ditemukan" 
            });
        }
        
        // Cek apakah ada detail atau assignment yang terkait
        const detailCount = await JamDinasDetail.count({ where: { id_jamdinas: id } });
        const assignmentCount = await DinasSetjam.count({ where: { id_jamdinas: id } });
        
        if (detailCount > 0 || assignmentCount > 0) {
            return res.status(400).json({ 
                success: false,
                error: "Tidak dapat menghapus jam dinas yang masih memiliki detail atau assignment" 
            });
        }
        
        await jamDinas.destroy();
        
        res.json({
            success: true,
            message: "Jam dinas berhasil dihapus"
        });
    } catch (error) {
        console.error('Delete Jam Dinas Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Create jam dinas detail
const createJamDinasDetail = async (req, res) => {
    try {
        const { id_jamdinas, hari, tipe = 'normal', jam_masuk_mulai, jam_masuk_selesai, jam_pulang_mulai, jam_pulang_selesai } = req.body;
        
        // Validasi input
        if (!id_jamdinas || !hari || !jam_masuk_mulai || !jam_masuk_selesai || !jam_pulang_mulai || !jam_pulang_selesai) {
            return res.status(400).json({ 
                success: false,
                message: "Semua field wajib diisi" 
            });
        }
        
        // Validasi format waktu
        const timeFields = [jam_masuk_mulai, jam_masuk_selesai, jam_pulang_mulai, jam_pulang_selesai];
        for (const time of timeFields) {
            if (!isValidTimeFormat(time)) {
                return res.status(400).json({ 
                    success: false,
                    message: "Format waktu harus HH:MM" 
                });
            }
        }
        
        // Cek apakah jam dinas ada
        const jamDinas = await JamDinas.findByPk(id_jamdinas);
        if (!jamDinas) {
            return res.status(404).json({ 
                success: false,
                message: "Jam dinas tidak ditemukan" 
            });
        }
        
        // Cek duplikasi detail untuk hari dan tipe yang sama
        const existingDetail = await JamDinasDetail.findOne({
            where: {
                id_jamdinas,
                hari,
                tipe
            }
        });
        
        if (existingDetail) {
            return res.status(400).json({ 
                success: false,
                message: `Detail untuk hari ${hari} dengan tipe ${tipe} sudah ada` 
            });
        }
        
        // Create detail
        const detail = await JamDinasDetail.create({
            id_jamdinas,
            hari,
            tipe,
            jam_masuk_mulai,
            jam_masuk_selesai,
            jam_pulang_mulai,
            jam_pulang_selesai
        });
        
        res.status(201).json({
            success: true,
            message: "Detail jam dinas berhasil dibuat",
            data: detail
        });
    } catch (error) {
        console.error('Create Jam Dinas Detail Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Get all jam dinas details
const getAllJamDinasDetails = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { id_jamdinas, hari, tipe } = req.query;

        let whereClause = {};
        
        if (id_jamdinas) whereClause.id_jamdinas = id_jamdinas;
        if (hari) whereClause.hari = hari;
        if (tipe) whereClause.tipe = tipe;

        const details = await JamDinasDetail.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas'
                }
            ],
            limit,
            offset,
            order: [['id', 'ASC']]
        });

        const totalPages = Math.ceil(details.count / limit);

        res.json({
            success: true,
            data: details.rows,
            pagination: {
                totalItems: details.count,
                totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get All Jam Dinas Details Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Get jam dinas detail by ID
const getJamDinasDetailById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const detail = await JamDinasDetail.findByPk(id, {
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas'
                }
            ]
        });
        
        if (!detail) {
            return res.status(404).json({ 
                success: false,
                message: "Detail jam dinas tidak ditemukan" 
            });
        }
        
        res.json({
            success: true,
            data: detail
        });
    } catch (error) {
        console.error('Get Jam Dinas Detail By ID Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Update jam dinas detail
const updateJamDinasDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const { hari, tipe, jam_masuk_mulai, jam_masuk_selesai, jam_pulang_mulai, jam_pulang_selesai } = req.body;
        
        const detail = await JamDinasDetail.findByPk(id);
        
        if (!detail) {
            return res.status(404).json({ 
                success: false,
                message: "Detail jam dinas tidak ditemukan" 
            });
        }
        
        // Validasi format waktu jika diupdate
        const timeFields = { jam_masuk_mulai, jam_masuk_selesai, jam_pulang_mulai, jam_pulang_selesai };
        for (const [key, time] of Object.entries(timeFields)) {
            if (time && !isValidTimeFormat(time)) {
                return res.status(400).json({ 
                    success: false,
                    message: `Format waktu ${key} harus HH:MM` 
                });
            }
        }
        
        // Cek duplikasi jika hari atau tipe diubah
        if (hari !== undefined || tipe !== undefined) {
            const newHari = hari || detail.hari;
            const newTipe = tipe || detail.tipe;
            
            const existingDetail = await JamDinasDetail.findOne({
                where: {
                    id: { [require('sequelize').Op.ne]: id },
                    id_jamdinas: detail.id_jamdinas,
                    hari: newHari,
                    tipe: newTipe
                }
            });
            
            if (existingDetail) {
                return res.status(400).json({ 
                    success: false,
                    message: `Detail untuk hari ${newHari} dengan tipe ${newTipe} sudah ada` 
                });
            }
        }
        
        await detail.update({
            hari: hari || detail.hari,
            tipe: tipe || detail.tipe,
            jam_masuk_mulai: jam_masuk_mulai || detail.jam_masuk_mulai,
            jam_masuk_selesai: jam_masuk_selesai || detail.jam_masuk_selesai,
            jam_pulang_mulai: jam_pulang_mulai || detail.jam_pulang_mulai,
            jam_pulang_selesai: jam_pulang_selesai || detail.jam_pulang_selesai
        });
        
        // Get updated detail with relations
        const updatedDetail = await JamDinasDetail.findByPk(id, {
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas'
                }
            ]
        });
        
        res.json({
            success: true,
            message: "Detail jam dinas berhasil diperbarui",
            data: updatedDetail
        });
    } catch (error) {
        console.error('Update Jam Dinas Detail Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Delete jam dinas detail
const deleteJamDinasDetail = async (req, res) => {
    try {
        const { id } = req.params;
        
        const detail = await JamDinasDetail.findByPk(id);
        
        if (!detail) {
            return res.status(404).json({ 
                success: false,
                message: "Detail jam dinas tidak ditemukan" 
            });
        }
        
        await detail.destroy();
        
        res.json({
            success: true,
            message: "Detail jam dinas berhasil dihapus"
        });
    } catch (error) {
        console.error('Delete Jam Dinas Detail Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Get jam dinas untuk organisasi tertentu
const getJamDinasForOrganization = async (req, res) => {
    try {
        const { id_skpd, id_satker, id_bidang, page = 1, limit = 10 } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        
        const whereClause = {};
        if (id_skpd) whereClause.id_skpd = id_skpd;
        if (id_satker) whereClause.id_satker = id_satker;
        if (id_bidang) whereClause.id_bidang = id_bidang;
        
        const assignments = await DinasSetjam.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas',
                    include: [
                        {
                            model: JamDinasDetail,
                            as: 'details'
                        }
                    ]
                }
            ],
            limit: limitNum,
            offset,
            order: [['dinset_id', 'ASC']]
        });

        const totalPages = Math.ceil(assignments.count / limitNum);
        
        res.json({
            success: true,
            data: assignments.rows,
            pagination: {
                totalItems: assignments.count,
                totalPages,
                currentPage: pageNum,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (error) {
        console.error('Get Jam Dinas For Organization Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Get all organization assignments
const getAllOrganizationAssignments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { search, status } = req.query;

        let whereClause = {};
        
        // Filter by status if provided
        if (status !== undefined) {
            whereClause.status = parseInt(status);
        }
        
        // Search by name if provided
        if (search) {
            whereClause.dinset_nama = {
                [require('sequelize').Op.like]: `%${search}%`
            };
        }

        const assignments = await DinasSetjam.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas',
                    include: [
                        {
                            model: JamDinasDetail,
                            as: 'details'
                        }
                    ]
                }
            ],
            limit,
            offset,
            order: [['dinset_id', 'DESC']]
        });

        const totalPages = Math.ceil(assignments.count / limit);

        res.json({
            success: true,
            data: assignments.rows,
            pagination: {
                totalItems: assignments.count,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Get All Organization Assignments Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Get organization assignment by ID
const getOrganizationAssignmentById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const assignment = await DinasSetjam.findByPk(id, {
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas',
                    include: [
                        {
                            model: JamDinasDetail,
                            as: 'details'
                        }
                    ]
                }
            ]
        });
        
        if (!assignment) {
            return res.status(404).json({ 
                success: false,
                message: "Assignment tidak ditemukan" 
            });
        }
        
        res.json({
            success: true,
            data: assignment
        });
    } catch (error) {
        console.error('Get Organization Assignment By ID Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Create organization assignment
const createOrganizationAssignment = async (req, res) => {
    try {
        const { dinset_nama, id_skpd, id_satker, id_bidang, id_jamdinas, status = 1 } = req.body;
        
        // Validasi input
        if (!dinset_nama || !id_jamdinas) {
            return res.status(400).json({ 
                success: false,
                message: "Nama assignment dan ID jam dinas wajib diisi" 
            });
        }
        
        // Validasi minimal satu organisasi harus diisi
        if (!id_skpd && !id_satker && !id_bidang) {
            return res.status(400).json({ 
                success: false,
                message: "Minimal satu organisasi (SKPD/Satker/Bidang) harus diisi" 
            });
        }
        
        // Cek apakah jam dinas ada
        const jamDinas = await JamDinas.findByPk(id_jamdinas);
        if (!jamDinas) {
            return res.status(404).json({ 
                success: false,
                message: "Jam dinas tidak ditemukan" 
            });
        }
        
        // Cek duplikasi assignment untuk organisasi yang sama
        const existingAssignment = await DinasSetjam.findOne({
            where: {
                id_skpd: id_skpd || null,
                id_satker: id_satker || null,
                id_bidang: id_bidang || null,
                status: 1
            }
        });
        
        if (existingAssignment) {
            return res.status(400).json({ 
                success: false,
                message: "Sudah ada assignment aktif untuk organisasi ini" 
            });
        }
        
        // Create assignment
        const assignment = await DinasSetjam.create({
            dinset_nama,
            id_skpd: id_skpd || null,
            id_satker: id_satker || null,
            id_bidang: id_bidang || null,
            id_jamdinas,
            status
        });
        
        // Get the created assignment with relations
        const createdAssignment = await DinasSetjam.findByPk(assignment.dinset_id, {
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas',
                    include: [
                        {
                            model: JamDinasDetail,
                            as: 'details'
                        }
                    ]
                }
            ]
        });
        
        res.status(201).json({
            success: true,
            message: "Assignment organisasi berhasil dibuat",
            data: createdAssignment
        });
    } catch (error) {
        console.error('Create Organization Assignment Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Update organization assignment
const updateOrganizationAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { dinset_nama, id_skpd, id_satker, id_bidang, id_jamdinas, status } = req.body;
        
        const assignment = await DinasSetjam.findByPk(id);
        
        if (!assignment) {
            return res.status(404).json({ 
                success: false,
                message: "Assignment tidak ditemukan" 
            });
        }
        
        // Jika id_jamdinas diupdate, cek apakah jam dinas ada
        if (id_jamdinas && id_jamdinas !== assignment.id_jamdinas) {
            const jamDinas = await JamDinas.findByPk(id_jamdinas);
            if (!jamDinas) {
                return res.status(404).json({ 
                    success: false,
                    message: "Jam dinas tidak ditemukan" 
                });
            }
        }
        
        // Cek duplikasi jika organisasi diubah
        if (id_skpd !== undefined || id_satker !== undefined || id_bidang !== undefined) {
            const newSkpd = id_skpd !== undefined ? id_skpd : assignment.id_skpd;
            const newSatker = id_satker !== undefined ? id_satker : assignment.id_satker;
            const newBidang = id_bidang !== undefined ? id_bidang : assignment.id_bidang;
            
            const existingAssignment = await DinasSetjam.findOne({
                where: {
                    dinset_id: { [require('sequelize').Op.ne]: id },
                    id_skpd: newSkpd || null,
                    id_satker: newSatker || null,
                    id_bidang: newBidang || null,
                    status: 1
                }
            });
            
            if (existingAssignment) {
                return res.status(400).json({ 
                    success: false,
                    message: "Sudah ada assignment aktif untuk organisasi ini" 
                });
            }
        }
        
        await assignment.update({
            dinset_nama: dinset_nama || assignment.dinset_nama,
            id_skpd: id_skpd !== undefined ? id_skpd : assignment.id_skpd,
            id_satker: id_satker !== undefined ? id_satker : assignment.id_satker,
            id_bidang: id_bidang !== undefined ? id_bidang : assignment.id_bidang,
            id_jamdinas: id_jamdinas || assignment.id_jamdinas,
            status: status !== undefined ? status : assignment.status
        });
        
        // Get updated assignment with relations
        const updatedAssignment = await DinasSetjam.findByPk(id, {
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas',
                    include: [
                        {
                            model: JamDinasDetail,
                            as: 'details'
                        }
                    ]
                }
            ]
        });
        
        res.json({
            success: true,
            message: "Assignment organisasi berhasil diperbarui",
            data: updatedAssignment
        });
    } catch (error) {
        console.error('Update Organization Assignment Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Delete organization assignment
const deleteOrganizationAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        
        const assignment = await DinasSetjam.findByPk(id);
        
        if (!assignment) {
            return res.status(404).json({ 
                success: false,
                message: "Assignment tidak ditemukan" 
            });
        }
        
        await assignment.destroy();
        
        res.json({
            success: true,
            message: "Assignment organisasi berhasil dihapus"
        });
    } catch (error) {
        console.error('Delete Organization Assignment Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Toggle organization assignment status
const toggleOrganizationAssignmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        const assignment = await DinasSetjam.findByPk(id);
        
        if (!assignment) {
            return res.status(404).json({ 
                success: false,
                message: "Assignment tidak ditemukan" 
            });
        }
        
        // Toggle status
        const newStatus = assignment.status === 1 ? 0 : 1;
        
        // Jika akan diaktifkan, cek apakah sudah ada assignment aktif untuk organisasi yang sama
        if (newStatus === 1) {
            const existingActiveAssignment = await DinasSetjam.findOne({
                where: {
                    dinset_id: { [require('sequelize').Op.ne]: id },
                    id_skpd: assignment.id_skpd,
                    id_satker: assignment.id_satker,
                    id_bidang: assignment.id_bidang,
                    status: 1
                }
            });
            
            if (existingActiveAssignment) {
                return res.status(400).json({ 
                    success: false,
                    message: "Sudah ada assignment aktif untuk organisasi ini" 
                });
            }
        }
        
        await assignment.update({ status: newStatus });
        
        // Get updated assignment with relations
        const updatedAssignment = await DinasSetjam.findByPk(id, {
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas',
                    include: [
                        {
                            model: JamDinasDetail,
                            as: 'details'
                        }
                    ]
                }
            ]
        });
        
        res.json({
            success: true,
            message: `Assignment ${newStatus === 1 ? 'diaktifkan' : 'dinonaktifkan'}`,
            data: updatedAssignment
        });
    } catch (error) {
        console.error('Toggle Organization Assignment Status Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

module.exports = {
    getAllJamDinas,
    getJamDinasById,
    createJamDinas,
    updateJamDinas,
    deleteJamDinas,
    createJamDinasDetail,
    getAllJamDinasDetails,
    getJamDinasDetailById,
    updateJamDinasDetail,
    deleteJamDinasDetail,
    getJamDinasForOrganization,
    getAllOrganizationAssignments,
    getOrganizationAssignmentById,
    createOrganizationAssignment,
    updateOrganizationAssignment,
    deleteOrganizationAssignment,
    toggleOrganizationAssignmentStatus
}; 