const { User, DeviceResetRequest } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { 
  mapUsersWithMasterData, 
  getUserWithMasterData, 
  getSkpdIdByUserLevel 
} = require('../utils/userMasterUtils');
const { getTodayDate } = require('../utils/timeUtils');
// User reset device sendiri (tanpa perlu persetujuan admin jika belum pernah reset dalam 1 bulan)
const resetDeviceSelf = async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.user.id;
    console.log(userId);

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ 
        error: "Alasan reset device minimal 10 karakter" 
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Cek apakah user sudah pernah reset device dalam 30 hari terakhir
    const thirtyDaysAgo = getTodayDate();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Cek riwayat reset dari tabel device_reset_requests yang approved
    const recentReset = await DeviceResetRequest.findOne({
      where: {
        user_id: userId,
        status: 'approved',
        approved_at: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    if (recentReset) {
      return res.status(400).json({
        error: "Anda sudah pernah reset device dalam 30 hari terakhir. Silakan ajukan request ke admin OPD untuk bantuan lebih lanjut."
      });
    }

    // Reset device_id jadi null dan hapus refresh_token (tanpa perlu persetujuan admin)
    await user.update({ 
      device_id: null,
      refresh_token: null // Paksa logout dari semua device
    });

    // Catat riwayat reset sebagai auto-approved
    await DeviceResetRequest.create({
      user_id: userId,
      reason: reason.trim(),
      status: 'approved',
      admin_response: 'Auto-approved (reset mandiri)',
      approved_by: userId, // Self-approved
      approved_at: getTodayDate()
    });

    res.json({
      message: 'Device berhasil direset. Anda harus login ulang di device baru.',
      success: true
    });

  } catch (error) {
    console.error('Reset Device Self Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// User request reset device (jika sudah pernah reset dalam 1 bulan, harus minta persetujuan admin)
const requestDeviceReset = async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ 
        error: "Alasan reset device minimal 10 karakter" 
      });
    }

    // Cek apakah ada request yang masih pending
    const pendingRequest = await DeviceResetRequest.findOne({
      where: {
        user_id: userId,
        status: 'pending'
      }
    });

    if (pendingRequest) {
      return res.status(400).json({
        error: "Anda masih memiliki request reset device yang pending. Silakan tunggu persetujuan admin OPD."
      });
    }

    // Buat request baru
    const resetRequest = await DeviceResetRequest.create({
      user_id: userId,
      reason: reason.trim(),
      status: 'pending'
    });

    res.status(201).json({
      message: "Request reset device berhasil diajukan. Admin OPD akan meninjau permintaan Anda.",
      data: {
        id: resetRequest.id,
        reason: resetRequest.reason,
        status: resetRequest.status,
        created_at: resetRequest.created_at
      }
    });

  } catch (error) {
    console.error('Request Device Reset Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Request reset device tanpa login (dengan verifikasi kredensial)
const requestDeviceResetWithoutLogin = async (req, res) => {
  try {
    const { username, password, reason } = req.body;

    // Validasi input
    if (!username || !password || !reason) {
      return res.status(400).json({ 
        error: "Username, password, dan alasan wajib diisi" 
      });
    }

    if (reason.trim().length < 10) {
      return res.status(400).json({ 
        error: "Alasan reset device minimal 10 karakter" 
      });
    }

    // Cari user berdasarkan username
    const user = await User.findOne({
      where: { username: username }
    });

    if (!user) {
      return res.status(404).json({ 
        error: "Username tidak ditemukan" 
      });
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: "Username atau password salah" 
      });
    }

    // Cek apakah user sudah pernah reset device dalam 30 hari terakhir
    const thirtyDaysAgo = getTodayDate();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Cek riwayat reset dari tabel device_reset_requests yang approved
    const recentReset = await DeviceResetRequest.findOne({
      where: {
        user_id: user.id,
        status: 'approved',
        approved_at: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    // Jika belum pernah reset dalam 30 hari, langsung proses reset
    if (!recentReset) {
      // Reset device_id jadi null dan hapus refresh_token (tanpa perlu persetujuan admin)
      await user.update({ 
        device_id: null,
        refresh_token: null // Paksa logout dari semua device
      });

      // Catat riwayat reset sebagai auto-approved
      const resetRequest = await DeviceResetRequest.create({
        user_id: user.id,
        reason: reason.trim(),
        status: 'approved',
        admin_response: 'Auto-approved (reset mandiri tanpa login)',
        approved_by: user.id, // Self-approved
        approved_at: getTodayDate()
      });

      return res.json({
        message: 'Device berhasil direset. Anda harus login ulang di device baru.',
        success: true,
        data: {
          id: resetRequest.id,
          username: user.username,
          email: user.email,
          reason: resetRequest.reason,
          status: resetRequest.status,
          created_at: resetRequest.created_at
        }
      });
    }

    // Jika sudah pernah reset dalam 30 hari, cek apakah ada request yang masih pending
    const pendingRequest = await DeviceResetRequest.findOne({
      where: {
        user_id: user.id,
        status: 'pending'
      }
    });

    if (pendingRequest) {
      return res.status(400).json({
        error: "Anda masih memiliki request reset device yang pending. Silakan tunggu persetujuan admin OPD."
      });
    }

    // Buat request baru untuk persetujuan admin
    const resetRequest = await DeviceResetRequest.create({
      user_id: user.id,
      reason: reason.trim(),
      status: 'pending'
    });

    res.status(201).json({
      message: "Request reset device berhasil diajukan. Admin OPD akan meninjau permintaan Anda.",
      data: {
        id: resetRequest.id,
        username: user.username,
        email: user.email,
        reason: resetRequest.reason,
        status: resetRequest.status,
        created_at: resetRequest.created_at
      }
    });

  } catch (error) {
    console.error('Request Device Reset Without Login Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// User cek status request reset device
const getMyResetRequests = async (req, res) => {
  try {
    const userId = req.user.id;
 
    
    const requests = await DeviceResetRequest.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'reason', 'status', 'admin_response', 'created_at', 'approved_at'],
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ]
    });

    console.log(requests,"<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

    // Enrich admin data dengan master data (jika ada)
    const admins = requests.map(req => req.admin).filter(Boolean);
    const adminsWithMasterData = admins.length > 0 ? await mapUsersWithMasterData(admins) : [];

    // Gabungkan data
    const enrichedData = requests.map(request => {
      const adminData = request.admin ? 
        (adminsWithMasterData.find(a => a.id === request.admin.id) || request.admin) : 
        null;

      return {
        ...request.toJSON(),
        admin: adminData
      };
    });

    console.log(requests);
    res.json({
      data: enrichedData
    });

  } catch (error) {
    console.error('Get My Reset Requests Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Admin OPD get all reset requests
const getAllResetRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    console.log(status, page, limit);

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await DeviceResetRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'level', 'id_opd', 'id_upt']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Map user data dengan master data
    const users = rows.map(row => row.user);
    const usersWithMasterData = await mapUsersWithMasterData(users);

    // Map admin data dengan master data (jika ada)
    const admins = rows.map(row => row.admin).filter(Boolean);
    const adminsWithMasterData = admins.length > 0 ? await mapUsersWithMasterData(admins) : [];

    // Gabungkan data
    const enrichedData = rows.map(row => {
      const userData = usersWithMasterData.find(u => u.id === row.user.id) || row.user;
      const adminData = row.admin ? 
        (adminsWithMasterData.find(a => a.id === row.admin.id) || row.admin) : 
        null;

      return {
        ...row.toJSON(),
        user: userData,
        admin: adminData
      };
    });

    res.json({
      data: enrichedData,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get All Reset Requests Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Admin OPD approve/reject reset request
const updateResetRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;
    const adminId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: "Status harus 'approved' atau 'rejected'"
      });
    }

    const resetRequest = await DeviceResetRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'device_id']
        }
      ]
    });

    if (!resetRequest) {
      return res.status(404).json({
        error: "Request reset device tidak ditemukan"
      });
    }

    if (resetRequest.status !== 'pending') {
      return res.status(400).json({
        error: "Request ini sudah diproses sebelumnya"
      });
    }

    // Update status request
    await resetRequest.update({
      status,
      admin_response: admin_response || null,
      approved_by: adminId,
      approved_at: getTodayDate()
    });

    // Jika approved, reset device_id user dan hapus refresh_token
    if (status === 'approved') {
      // Ambil user instance yang asli untuk update
      const userToUpdate = await User.findByPk(resetRequest.user.id);
      if (userToUpdate) {
        await userToUpdate.update({
          device_id: null,
          refresh_token: null // Paksa logout dari semua device
        });
      }
    }

    // Enrich user data dengan master data untuk response
    let userWithMasterData = null;
    if (resetRequest && resetRequest.user) {
      userWithMasterData = await getUserWithMasterData(resetRequest.user.id);
    }

    res.json({
      message: `Request reset device berhasil ${status === 'approved' ? 'disetujui. User harus login ulang di device baru.' : 'ditolak'}`,
      data: {
        id: resetRequest.id,
        status: resetRequest.status,
        admin_response: resetRequest.admin_response,
        approved_at: resetRequest.approved_at,
        user: userWithMasterData || resetRequest.user
      }
    });

  } catch (error) {
    console.error('Update Reset Request Status Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// User daftarkan device baru setelah reset
const registerNewDevice = async (req, res) => {
  try {
    const { device_id } = req.body;
    const userId = req.user.id;

    if (!device_id) {
      return res.status(400).json({ error: 'Device ID wajib diisi' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Cek apakah user sudah memiliki device_id
    if (user.device_id && user.device_id !== device_id) {
      return res.status(400).json({ 
        error: 'Akun ini sudah terdaftar di device lain. Silakan reset device terlebih dahulu.' 
      });
    }

    // Update device_id
    await user.update({ device_id: device_id });

    res.json({ 
      message: 'Device berhasil didaftarkan',
      success: true 
    });

  } catch (error) {
    console.error('Register New Device Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  resetDeviceSelf,
  registerNewDevice,
  requestDeviceReset,
  requestDeviceResetWithoutLogin,
  getMyResetRequests,
  getAllResetRequests,
  updateResetRequestStatus
};