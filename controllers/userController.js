const { User, Lokasi, MstPegawai, SkpdTbl, AdmOpd, AdmUpt, MasterJadwalKegiatan, JadwalKegiatanLokasiSkpd, Kehadiran, KehadiranKegiatan } = require("../models");
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
const { getEffectiveLocation } = require("../utils/lokasiHierarchyUtils");


// Mendapatkan kegiatan hari ini dengan lokasinya (OPTIMIZED)
const getTodayActivities = async (kdsatker) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    // Query yang dioptimasi dengan filter langsung di database
    const activities = await MasterJadwalKegiatan.findAll({
      where: {
        tanggal_kegiatan: today
      },
      include: [
        {
          model: JadwalKegiatanLokasiSkpd,
          where: {
            kdskpd: kdsatker // Filter langsung di database
          },
          required: true, // INNER JOIN untuk performa lebih baik
          include: [
            {
              model: Lokasi,
              where: {
                status: true
              },
              required: true,
              attributes: ['lokasi_id', 'ket', 'lat', 'lng', 'range'] // Hanya ambil field yang diperlukan
            }
          ],
          attributes: ['kdskpd'] // Hanya ambil field yang diperlukan
        }
      ],
      attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan', 'jam_mulai', 'jam_selesai'], // Hanya ambil field yang diperlukan
      order: [
        ['jam_mulai', 'ASC']
      ]
    });

    return activities.map(activity => ({
      id_kegiatan: activity.id_kegiatan,
      tanggal_kegiatan: activity.tanggal_kegiatan,
      jenis_kegiatan: activity.jenis_kegiatan,
      keterangan: activity.keterangan,
      jam_mulai: activity.jam_mulai,
      jam_selesai: activity.jam_selesai,
      lokasi_list: activity.JadwalKegiatanLokasiSkpds.map(jkls => ({
        lokasi_id: jkls.Lokasi.lokasi_id,
        ket: jkls.Lokasi.ket,
        lat: jkls.Lokasi.lat,
        lng: jkls.Lokasi.lng,
        range: jkls.Lokasi.range,
        satker: jkls.kdskpd
      }))
    }));
  } catch (error) {
    console.error('Error getting today activities:', error);
    return [];
  }
};

const getUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const userData = await getUserWithMasterData(userId);

    if (!userData) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }


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
    const { search, status, id_satker: filter_satker, bidangf: filter_bidang } = req.query; // Support search, status, dan filter organisasi
    
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

    let totalUsers;
    let users;

    // Jika ada search query, gunakan search function
    if (search) {
      // For search, get total count from master data dengan filter STATUSAKTIF = 'AKTIF'
      let masterSearchCondition = {
        [Op.and]: [
          {
            [Op.or]: [
              { NIP: { [Op.like]: `%${search}%` } },
              { NAMA: { [Op.like]: `%${search}%` } }
            ]
          },
          { STATUSAKTIF: 'AKTIF' }
        ]
      };

      // Apply organizational filters
      let orgFilters = {};
      if (id_skpd) orgFilters.KDSKPD = id_skpd;
      if (filter_satker) orgFilters.KDSATKER = filter_satker;
      if (filter_bidang) orgFilters.BIDANGF = filter_bidang;

      if (Object.keys(orgFilters).length > 0) {
        masterSearchCondition[Op.and].push(orgFilters);
      }

      // Count how many of those NIPs exist in User table
      const masterNips = await MstPegawai.findAll({
        where: masterSearchCondition,
        attributes: ['NIP', 'NM_UNIT_KERJA']
      });

      const foundNips = masterNips.map(p => p.NIP);
      
      if (foundNips.length === 0) {
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

      // Tambahkan filter status jika ada
      let userWhere = {
        username: {
          [Op.in]: foundNips
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
      // Normal get all logic
      // Build organizational filters dengan filter STATUSAKTIF = 'AKTIF'
      let orgFilters = {
        STATUSAKTIF: 'AKTIF'
      };
      if (id_skpd) orgFilters.KDSKPD = id_skpd;
      if (filter_satker) orgFilters.KDSATKER = filter_satker;
      if (filter_bidang) orgFilters.BIDANGF = filter_bidang;

      // Ambil data master terlebih dahulu untuk filter
      const pegawaiWithOrg = await MstPegawai.findAll({
        where: orgFilters,
        attributes: ['NIP', 'NM_UNIT_KERJA']
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
    }

    const totalPages = Math.ceil(totalUsers / limit);

    // Build filter response
    let filterResponse = {};
    if (id_skpd) filterResponse.id_skpd = id_skpd;
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

// Mendapatkan kehadiran dan lokasi user (OPTIMIZED)
const getKehadiranDanLokasi = async (req, res) => {
  try {
    const userNip = req.user.username;

    // Mendapatkan waktu saat ini dalam WIB
    const now = new Date();
    const absenTgl = now.toISOString().split('T')[0];

    // Format tanggal untuk absen_tgl (YYYY-MM-DD)
    const startOfDay = new Date(absenTgl);
    const endOfDay = new Date(absenTgl);
    endOfDay.setHours(23, 59, 59, 999);

    // PARALLEL PROCESSING: Jalankan query yang independen secara bersamaan
    const [kehadiranBiasa, pegawai] = await Promise.all([
      // Cek kehadiran biasa hari ini
      Kehadiran.findOne({
        where: {
          absen_nip: userNip,
          absen_tgl: {
            [Op.between]: [startOfDay, endOfDay]
          }
        },
        attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'absen_tgl', 'absen_tgljam', 'absen_checkin', 'absen_checkout', 'absen_kat', 'absen_apel', 'absen_sore']
      }),
      // Dapatkan data pegawai untuk mendapatkan satker
      getPegawaiByNip(userNip)
    ]);

    if (!pegawai) {
      return res.status(404).json({ 
        success: false,
        message: "Data pegawai tidak ditemukan" 
      });
    }

    // PARALLEL PROCESSING: Jalankan query lokasi dan kehadiran kegiatan secara bersamaan
    const [effectiveLocation, kehadiranKegiatan] = await Promise.all([
      // Dapatkan lokasi efektif
      getEffectiveLocation(
        pegawai.KDSATKER,  // idSatker
        pegawai.BIDANGF,   // idBidang
        null               // idSubBidang (tidak ada di data pegawai saat ini)
      ),
      // Cek kehadiran kegiatan hari ini
      KehadiranKegiatan.findAll({
        where: {
          absen_nip: userNip,
          absen_tgl: {
            [Op.between]: [startOfDay, endOfDay]
          }
        },
        include: [
          {
            model: MasterJadwalKegiatan,
            as: 'kegiatan',
            attributes: ['id_kegiatan', 'jenis_kegiatan', 'keterangan', 'jam_mulai', 'jam_selesai']
          }
        ],
        attributes: ['absen_id', 'absen_nip', 'lokasi_id', 'id_kegiatan']
      })
    ]);

    return res.status(200).json({
      success: true,
      message: "Data kehadiran dan lokasi berhasil ditemukan",
      data: {
        kehadiran_biasa: kehadiranBiasa,
        lokasi: effectiveLocation,
        kehadiran_kegiatan: kehadiranKegiatan
      }
    });
  } catch (error) {
    console.error('GetKehadiranDanLokasi Error:', error);
    return res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};




module.exports = { 
  getUser, 
  getAllUser, 
  getUserById, 
  updateUser, 
  updateUserByAdmin, 
  searchUsersOpd, 
  saveFcmToken, 
  resetDeviceId, 
  getKehadiranDanLokasi
};