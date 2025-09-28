const { User, Lokasi, MstPegawai, SkpdTbl, AdmOpd, AdmUpt } = require("../models");
const Sequelize = require("sequelize");
const { Op } = Sequelize;
const { 
  mapUsersWithMasterData, 
  getUserWithMasterData, 
  getSkpdIdByUserLevel, 
  searchUsersWithMasterData 
} = require("../utils/userMasterUtils");
const { getPegawaiByNip } = require("../utils/masterDbUtils");
const { getLokasiByUserData } = require("../utils/locationUtils");

const getUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const userData = await getUserWithMasterData(userId);

    if (!userData) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    console.log(userData,"<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

    res.json(userData);
  } catch (error) {
    console.error('GetUser Error:', error);
    res.status(500).json({ error: error.message });
  }
};


const getAllUser = async (req, res) => {
  try {
  // Ambil parameter pagination, search, dan status dari query
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const { search, status, id_skpd: filter_skpd, id_satker: filter_satker, bidangf: filter_bidang } = req.query; // Support search, status, dan filter organisasi
    
    // Ambil level user dari request (req.user.level)
    const userLevel = req.user.level;
    let id_skpd;
    console.log(userLevel,"<<<<<<<<<<<<<<<<<<<<<<");

    if (userLevel === '1') {
      id_skpd = req.query.id_skpd;
    } else if (userLevel === '2' || userLevel === '3') {
      const user = await User.findByPk(req.user.id, {
        include: [
          {
            model: userLevel === '2' ? AdmOpd : AdmUpt,
            attributes: ['id_skpd']
          }
        ]
      });
      id_skpd = getSkpdIdByUserLevel(user, userLevel);
    }

    console.log(id_skpd,"<<<<<<<s<<<<<<<<<<<<<<<<<<<<<<");

    let totalUsers;
    let users;

    // Jika ada search query, gunakan search function
    if (search) {
      // Tambahkan status ke filter jika ada
      users = await searchUsersWithMasterData(search, id_skpd, { limit, offset, order: [['id', 'DESC']], status });

      if (users.length === 0) {
        return res.json({
          data: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage: page,
            itemsPerPage: limit
          },
          filter: id_skpd ? { id_skpd } : null,
          searchQuery: search
        });
      }

      // For search, get total count from master data
      let masterSearchCondition = {
        [Op.or]: [
          { NIP: { [Op.like]: `%${search}%` } },
          { NAMA: { [Op.like]: `%${search}%` } }
        ]
      };

      // Apply organizational filters
      let orgFilters = {};
      if (id_skpd) orgFilters.KDSKPD = id_skpd;
      if (filter_skpd) orgFilters.KDSKPD = filter_skpd;
      if (filter_satker) orgFilters.KDSATKER = filter_satker;
      if (filter_bidang) orgFilters.BIDANGF = filter_bidang;

      if (Object.keys(orgFilters).length > 0) {
        masterSearchCondition = {
          [Op.and]: [
            masterSearchCondition,
            orgFilters
          ]
        };
      }

      // Count total matching records in master data
      const masterCount = await MstPegawai.count({
        where: masterSearchCondition
      });

      // Count how many of those NIPs exist in User table
      const masterNips = await MstPegawai.findAll({
        where: masterSearchCondition,
        attributes: ['NIP']
      });

      const foundNips = masterNips.map(p => p.NIP);
      // Tambahkan filter status jika ada
      let userWhere = {
        username: {
          [Op.in]: foundNips
        }
      };
      if (status !== undefined) {
        userWhere.status = status;
      }
      totalUsers = foundNips.length > 0 ? await User.count({
        where: userWhere
      }) : 0;

    } else {
      // Normal get all logic
      // Build organizational filters
      let orgFilters = {};
      if (id_skpd) orgFilters.KDSKPD = id_skpd;
      if (filter_skpd) orgFilters.KDSKPD = filter_skpd;
      if (filter_satker) orgFilters.KDSATKER = filter_satker;
      if (filter_bidang) orgFilters.BIDANGF = filter_bidang;

      if (Object.keys(orgFilters).length > 0) {
        // Ambil data master terlebih dahulu untuk filter
        const pegawaiWithOrg = await MstPegawai.findAll({
          where: orgFilters,
          attributes: ['NIP']
        });

        // Buat array NIP yang valid untuk filter
        const validNips = pegawaiWithOrg.map(p => p.NIP);

        if (validNips.length === 0) {
          // Jika tidak ada data master, return empty
          return res.json({
            data: [],
            pagination: {
              totalItems: 0,
              totalPages: 0,
              currentPage: page,
              itemsPerPage: limit
            },
            filter: orgFilters
          });
        }

        // Hitung total user yang memiliki NIP valid
        let userWhere = {
          username: {
            [Op.in]: validNips
          }
        };
        if (status !== undefined) {
          userWhere.status = status;
        }
        totalUsers = await User.count({
          where: userWhere
        });

        // Ambil user dengan pagination dan urutkan DESC
        const userList = await User.findAll({
          where: userWhere,
          attributes: { exclude: ["password_hash"] },
          limit: limit,
          offset: offset,
          order: [['id', 'DESC']],
        });

        // Map dengan data master menggunakan utility
        users = await mapUsersWithMasterData(userList);

      } else {
        // Tanpa filter - ambil semua data dengan pagination dan urutkan DESC
        let userWhere = {};
        if (status !== undefined) {
          userWhere.status = status;
        }
        totalUsers = await User.count({
          where: userWhere
        });
        const userList = await User.findAll({
          where: userWhere,
          attributes: { exclude: ["password_hash"] },
          limit: limit,
          offset: offset,
          order: [['id', 'DESC']],
        });

        // Map dengan data master menggunakan utility
        users = await mapUsersWithMasterData(userList);
      }
    }

    const totalPages = Math.ceil(totalUsers / limit);

    // Build filter response
    let filterResponse = {};
    if (id_skpd) filterResponse.id_skpd = id_skpd;
    if (filter_skpd) filterResponse.id_skpd = filter_skpd;
    if (filter_satker) filterResponse.id_satker = filter_satker;
    if (filter_bidang) filterResponse.bidangf = filter_bidang;

    // Kirim response dengan informasi pagination
    res.json({
      data: users,
      pagination: {
        totalItems: totalUsers,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      filter: Object.keys(filterResponse).length > 0 ? filterResponse : null,
      searchQuery: search || null
    });
  } catch (error) {
    console.error('GetAllUser Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const searchUsersOpd = async (req, res) => {
  try {
    const { query } = req.query;
    console.log(query,"<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
    
    // Ambil user beserta relasi untuk mendapatkan id_skpd
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: AdmOpd,
          attributes: ['id_skpd']
        }
      ]
    });
    
    const id_skpd = user.AdmOpd?.id_skpd;
    
    // Gunakan utility untuk search dengan master data
    const usersWithMasterData = await searchUsersWithMasterData(query, id_skpd);

    if (usersWithMasterData.length === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    res.json({
      data: usersWithMasterData,
      filter: id_skpd ? { id_skpd } : null
    });
  } 
  catch (error) {
    console.error('SearchUsersOpd Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Gunakan utility untuk mendapatkan data user dengan master data
    const userData = await getUserWithMasterData(id);
    
    if (!userData) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // Buat userData object untuk lokasi utility
    const locationUserData = {
      kdskpd: userData.kdskpd,
      kdsatker: userData.kdsatker,
      bidangf: userData.bidangf
    };

    // Gunakan utility untuk mencari lokasi berdasarkan user data
    const lokasiResult = await getLokasiByUserData(locationUserData);

    // Format response dengan data yang sudah diperkaya dari utility
    const response = {
      ...userData,
      lokasi: lokasiResult ? lokasiResult.data : null,
      lokasi_level: lokasiResult ? lokasiResult.level : null,
      lokasi_count: lokasiResult ? lokasiResult.count : 0
    };

    res.json(response);
  }
  catch (error) {
    console.error('GetUserById Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, level, id_opd, id_upt, status } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    await user.update({ username, email, level, id_opd, id_upt, status });
    res.json({ message: "User berhasil diperbarui" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user by admin
const updateUserByAdmin = async (req, res) => {
  try {

    console.log(req.body);
    const { id } = req.params;
    const { username, email, level, id_opd, id_upt, status, device_id } = req.body;

    // Find user by ID
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: "Username sudah digunakan" });
      }
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "Email sudah digunakan" });
      }
    }

    // Update user data
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (level) updateData.level = level;
    if (id_opd) updateData.id_opd = id_opd;
    if (id_upt) updateData.id_upt = id_upt;
    if (status !== undefined) updateData.status = status;
    updateData.device_id = device_id;
    console.log(updateData);
    await user.update(updateData);

    // Get updated user data (excluding password)
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ["password_hash"] }
    });

    res.json({ 
      message: "User berhasil diperbarui",
      data: updatedUser
    });
  } catch (error) {
    console.error('Update User By Admin Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const saveFcmToken = async (req, res) => {
  const username = req.user.username; 
  const { fcm_token, device_id } = req.body;

  if (!fcm_token) return res.status(400).json({ error: 'Token wajib' });

  const updateData = { fcm_token: fcm_token };
  
  // Jika device_id disediakan, update juga device_id
  if (device_id) {
    updateData.device_id = device_id;
  }

  await User.update(updateData, { where: { username: username } });

  res.json({ success: true });
};

// Reset device ID (hanya bisa dilakukan jika user belum memiliki device_id atau sudah mendapat persetujuan admin)
const resetDeviceId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { device_id } = req.body;

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
        error: 'Akun ini sudah terdaftar di device lain. Silakan ajukan reset device melalui menu yang tersedia.' 
      });
    }

    // Update device_id
    await user.update({ device_id: device_id });

    res.json({ 
      message: 'Device berhasil didaftarkan',
      success: true 
    });

  } catch (error) {
    console.error('Reset Device ID Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Mendapatkan lokasi user berdasarkan SKPD/Satker/Bidang
const getMyLocation = async (req, res) => {
  try {
    const userNip = req.user.username;
    
    // Dapatkan data pegawai dari database master berdasarkan NIP
    const pegawai = await getPegawaiByNip(userNip);

    if (!pegawai) {
      return res.status(404).json({ 
        message: "Data pegawai tidak ditemukan" 
      });
    }

    // Buat userData object dari data pegawai
    const userData = {
      kdskpd: pegawai.KDSKPD,
      kdsatker: pegawai.KDSATKER,
      bidangf: pegawai.BIDANGF
    };

    // Gunakan utility untuk mendapatkan lokasi berdasarkan user data
    const lokasiResult = await getLokasiByUserData(userData);

    if (!lokasiResult) {
      return res.status(404).json({ 
        message: "Data lokasi tidak ditemukan untuk pegawai ini" 
      });
    }

    return res.status(200).json({
      data: lokasiResult.data,
      lokasi_level: lokasiResult.level,
      lokasi_count: lokasiResult.count
    });
  } catch (error) {
    console.error('GetMyLocation Error:', error);
    return res.status(500).json({ 
      message: "Terjadi kesalahan server" 
    });
  }
};

module.exports = { getUser, getAllUser, getUserById, updateUser, updateUserByAdmin, searchUsersOpd, saveFcmToken, resetDeviceId, getMyLocation };