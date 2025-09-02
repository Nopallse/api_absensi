const { JamDinas, JamDinasDetail, DinasSetjam, SystemSetting } = require('../models');
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
                message: "Jam dinas tidak ditemukan" 
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
                    message: "Format waktu harus HH:MM:SS" 
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

// Get jam dinas untuk organisasi tertentu
const getJamDinasForOrganization = async (req, res) => {
    try {
        const { id_skpd, id_satker, id_bidang } = req.query;
        
        const whereClause = {};
        if (id_skpd) whereClause.id_skpd = id_skpd;
        if (id_satker) whereClause.id_satker = id_satker;
        if (id_bidang) whereClause.id_bidang = id_bidang;
        
        // Get active tipe from system settings
        const tipeSetting = await SystemSetting.findOne({
            where: { key: 'active_tipe_jadwal' }
        });
        
        const activeTipe = tipeSetting ? tipeSetting.value : 'normal';
        
        const assignments = await DinasSetjam.findAll({
            where: whereClause,
            include: [
                {
                    model: JamDinas,
                    as: 'jamDinas',
                    include: [
                        {
                            model: JamDinasDetail,
                            as: 'details',
                            where: { tipe: activeTipe }
                        }
                    ]
                }
            ]
        });
        
        res.json({
            success: true,
            data: assignments,
            activeTipe: activeTipe
        });
    } catch (error) {
        console.error('Get Jam Dinas For Organization Error:', error);
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
    getJamDinasForOrganization,
}; 