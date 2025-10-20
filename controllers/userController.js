const { User, Lokasi, MstPegawai, SkpdTbl, AdmOpd, AdmUpt, MasterJadwalKegiatan, JadwalKegiatanLokasiSatker, Kehadiran, KehadiranKegiatan } = require("../models");
const Sequelize = require("sequelize");
const { Op } = Sequelize;
const { 
  mapUsersWithMasterData, 
  mapUsersWithMasterDataOptimized,
  getUserWithMasterData, 
  getSatkerIdByUserLevel, 
  searchUsersWithMasterData 
} = require("../utils/userMasterUtils");
const { getPegawaiByNip } = require("../utils/masterDbUtils");
const { getLokasiByUserData } = require("../utils/locationUtils");
const { getEffectiveLocation } = require("../utils/lokasiHierarchyUtils");
const { getTodayKegiatanFromCache } = require("../utils/cacheUtils");


// Mendapatkan kegiatan hari ini dengan lokasinya (OPTIMIZED)
const getTodayActivities = async (kdsatker) => {
  try {
    return await getTodayKegiatanFromCache(kdsatker, async () => {
      const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

      // Query yang dioptimasi dengan filter langsung di database
      const activities = await MasterJadwalKegiatan.findAll({
        where: {
          tanggal_kegiatan: today
        },
        include: [
          {
            model: JadwalKegiatanLokasiSatker,
            where: {
              id_satker: kdsatker // Filter langsung di database
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
            attributes: ['id_satker'] // Hanya ambil field yang diperlukan
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
        lokasi_list: activity.JadwalKegiatanLokasiSatkers.map(jkls => ({
          lokasi_id: jkls.Lokasi.lokasi_id,
          ket: jkls.Lokasi.ket,
          lat: jkls.Lokasi.lat,
          lng: jkls.Lokasi.lng,
          range: jkls.Lokasi.range,
          satker: jkls.id_satker
        }))
      }));
    });
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, id_satker: filter_satker, bidangf: filter_bidang } = req.query;

    // Build kondisi langsung ke tabel master (mstpegawai)
    let whereCondition = {
      STATUSAKTIF: 'AKTIF'
    };

    if (filter_satker) whereCondition.KDSATKER = filter_satker;
    if (filter_bidang) whereCondition.BIDANGF = filter_bidang;

    if (search) {
      whereCondition = {
        [Op.and]: [
          whereCondition,
          {
            [Op.or]: [
              { NIP: { [Op.like]: `%${search}%` } },
              { NAMA: { [Op.like]: `%${search}%` } }
            ]
          }
        ]
      };
    }

    const { count, rows } = await MstPegawai.findAndCountAll({
      where: whereCondition,
      attributes: [
        ['NIP', 'nip'],
        ['NAMA', 'nama'],
        ['KODE_UNIT_KERJA', 'kd_unit_kerja'],
        ['NM_UNIT_KERJA', 'nm_unit_kerja'],
        ['KDSATKER', 'kdsatker'],
        ['BIDANGF', 'bidangf']
      ],
      limit: limit,
      offset: offset,
      order: [['NAMA', 'ASC']],
      raw: true
    });

    // Map ke bentuk data minimal yang dibutuhkan frontend
    const data = rows.map(row => ({
      ...row,
      // Biarkan satker dan bidang name null agar tooltip tetap aman di FE
      satker: null,
      bidang: null
    }));

    res.json({
      data,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        itemsPerPage: limit
      },
      filter: (filter_satker || filter_bidang) ? {
        ...(filter_satker ? { id_satker: filter_satker } : {}),
        ...(filter_bidang ? { bidangf: filter_bidang } : {})
      } : null,
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
    
    // Ambil user beserta relasi untuk mendapatkan id_satker
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: AdmOpd,
          attributes: ['id_satker']
        }
      ]
    });
    
    const id_satker = user.AdmOpd?.id_satker;
    
    // Gunakan utility untuk search dengan master data
    const usersWithMasterData = await searchUsersWithMasterData(query, id_satker);

    if (usersWithMasterData.length === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    res.json({
      data: usersWithMasterData,
      filter: id_satker ? { id_satker } : null
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



// Update user by admin
const updateUserByAdmin = async (req, res) => {
  try {

    console.log(req.body);
    const { id } = req.params;
    const { device_id } = req.body;

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
  updateUserByAdmin, 
  searchUsersOpd, 
  saveFcmToken, 
  resetDeviceId, 
  getKehadiranDanLokasi
};