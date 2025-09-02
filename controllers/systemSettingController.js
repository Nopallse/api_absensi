const { SystemSetting } = require('../models');

// Get all system settings
const getAllSettings = async (req, res) => {
    try {
        const settings = await SystemSetting.findAll();
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get Settings Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Update tipe jadwal global
const updateGlobalTipeJadwal = async (req, res) => {
    try {
        const { tipe } = req.body;
        
        if (!tipe) {
            return res.status(400).json({ 
                success: false,
                message: "Tipe jadwal wajib diisi" 
            });
        }

        // Update system setting
        const [setting] = await SystemSetting.update(
            { value: tipe },
            { 
                where: { key: 'active_tipe_jadwal' },
                returning: true
            }
        );

        // Get updated setting
        const updatedSetting = await SystemSetting.findOne({
            where: { key: 'active_tipe_jadwal' }
        });

        res.json({
            success: true,
            message: `Tipe jadwal global berhasil diubah menjadi ${tipe}`,
            data: updatedSetting
        });
    } catch (error) {
        console.error('Update Global Tipe Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

// Get current active tipe jadwal
const getCurrentTipeJadwal = async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({
            where: { key: 'active_tipe_jadwal' }
        });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: "Pengaturan tipe jadwal tidak ditemukan"
            });
        }

        res.json({
            success: true,
            data: {
                tipe: setting.value
            }
        });
    } catch (error) {
        console.error('Get Current Tipe Error:', error);
        res.status(500).json({ 
            success: false,
            error: "Internal server error" 
        });
    }
};

module.exports = {
    getAllSettings,
    updateGlobalTipeJadwal,
    getCurrentTipeJadwal
};
