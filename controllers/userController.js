const { User, Lokasi, MstPegawai, SkpdTbl } = require("../models");
const Sequelize = require("sequelize");
const { Op } = Sequelize;

const getUser = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId);

    const user = await User.findOne({
      where: { id: userId },
      attributes: { exclude: ["password_hash"] }
    });

    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // Dapatkan data pegawai dari database master berdasarkan NIP
    const pegawai = await MstPegawai.findOne({
      where: { NIP: user.username },
      include: [
        {
          model: SkpdTbl,
          attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
        }
      ],
      attributes: ['NIP', 'NAMA', 'KDSKPD', 'KDPANGKAT', 'JENIS_JABATAN']
    });

    // Format response dengan data lengkap
    const userData = user.toJSON();
    
    if (pegawai) {
      userData.nama = pegawai.NAMA;
      userData.nip = user.username;
      userData.kdskpd = pegawai.KDSKPD;
      userData.skpd = pegawai.SkpdTbl ? pegawai.SkpdTbl.NMSKPD : null;
      userData.status_skpd = pegawai.SkpdTbl ? pegawai.SkpdTbl.StatusSKPD : null;
      userData.pangkat = pegawai.KDPANGKAT;
      userData.jabatan = pegawai.JENIS_JABATAN;
    } else {
      userData.nama = null;
      userData.nip = user.username;
      userData.kdskpd = null;
      userData.skpd = null;
      userData.status_skpd = null;
      userData.pangkat = null;
      userData.jabatan = null;
    }

    res.json(userData);
  } catch (error) {
    console.error('GetUser Error:', error);
    res.status(500).json({ error: error.message });
  }
};


const getAllUser = async (req, res) => {
  try {
    // Ambil parameter pagination dari query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Ambil parameter filter
    const { id_skpd } = req.query;
    console.log(id_skpd,"<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

    let totalUsers;
    let users;

    if (id_skpd) {
      // OPTIMASI: Ambil data master terlebih dahulu untuk filter
      const pegawaiWithSkpd = await MstPegawai.findAll({
        where: { KDSKPD: id_skpd },
        include: [
          {
            model: SkpdTbl,
            attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
          }
        ],
        attributes: ['NIP', 'NAMA', 'KDSKPD']
      });

      // Buat array NIP yang valid untuk filter
      const validNips = pegawaiWithSkpd.map(p => p.NIP);
      
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
          filter: { id_skpd }
        });
      }

      // Hitung total user yang memiliki NIP valid
      totalUsers = await User.count({
        where: {
          username: validNips
        }
      });

      // Ambil user dengan pagination
      const userList = await User.findAll({
        where: {
          username: validNips
        },
        attributes: { exclude: ["password_hash"] },
        limit: limit,
        offset: offset,
      });

      // Buat map untuk data master untuk lookup cepat
      const masterDataMap = new Map();
      pegawaiWithSkpd.forEach(p => {
        masterDataMap.set(p.NIP, {
          nama: p.NAMA,
          kdskpd: p.KDSKPD,
          skpd: p.SkpdTbl ? p.SkpdTbl.NMSKPD : null,
          status_skpd: p.SkpdTbl ? p.SkpdTbl.StatusSKPD : null
        });
      });

      // Gabungkan data tanpa Promise.all
      users = userList.map(user => {
        const userData = user.toJSON();
        const masterData = masterDataMap.get(user.username);
        
        if (masterData) {
          userData.nama = masterData.nama;
          userData.nip = user.username;
          userData.kdskpd = masterData.kdskpd;
          userData.skpd = masterData.skpd;
          userData.status_skpd = masterData.status_skpd;
        } else {
          userData.nama = null;
          userData.nip = user.username;
          userData.kdskpd = null;
          userData.skpd = null;
          userData.status_skpd = null;
        }
        
        return userData;
      });

    } else {
      // Tanpa filter - ambil semua data dengan pagination
      totalUsers = await User.count();
      const userList = await User.findAll({
        attributes: { exclude: ["password_hash"] },
        limit: limit,
        offset: offset,
      });

      // OPTIMASI: Ambil semua data master sekaligus
      const usernames = userList.map(u => u.username);
      const allPegawai = await MstPegawai.findAll({
        where: {
          NIP: usernames
        },
        include: [
          {
            model: SkpdTbl,
            attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
          }
        ],
        attributes: ['NIP', 'NAMA', 'KDSKPD']
      });

      // Buat map untuk lookup cepat
      const masterDataMap = new Map();
      allPegawai.forEach(p => {
        masterDataMap.set(p.NIP, {
          nama: p.NAMA,
          kdskpd: p.KDSKPD,
          skpd: p.SkpdTbl ? p.SkpdTbl.NMSKPD : null,
          status_skpd: p.SkpdTbl ? p.SkpdTbl.StatusSKPD : null
        });
      });

      // Gabungkan data tanpa Promise.all
      users = userList.map(user => {
        const userData = user.toJSON();
        const masterData = masterDataMap.get(user.username);
        
        if (masterData) {
          userData.nama = masterData.nama;
          userData.nip = user.username;
          userData.kdskpd = masterData.kdskpd;
          userData.skpd = masterData.skpd;
          userData.status_skpd = masterData.status_skpd;
        } else {
          userData.nama = null;
          userData.nip = user.username;
          userData.kdskpd = null;
          userData.skpd = null;
          userData.status_skpd = null;
        }
        
        return userData;
      });
    }

    const totalPages = Math.ceil(totalUsers / limit);

    // Kirim response dengan informasi pagination
    res.json({
      data: users,
      pagination: {
        totalItems: totalUsers,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      filter: id_skpd ? { id_skpd } : null
    });
  } catch (error) {
    console.error('GetAllUser Error:', error);
    res.status(500).json({ error: error.message });
  }
};

//search user by username || email
const searchUsers = async (req, res) => {
  try {
    const { query, id_skpd } = req.query;
    const users = await User.findAll({
      where: {
        [Sequelize.Op.or]: [
          { username: { [Sequelize.Op.like]: `%${query}%` } },
          { email: { [Sequelize.Op.like]: `%${query}%` } },
        ],
      }
    });

    if (users.length === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // OPTIMASI: Ambil semua data master sekaligus
    const usernames = users.map(u => u.username);
    const allPegawai = await MstPegawai.findAll({
      where: {
        NIP: usernames
      },
      include: [
        {
          model: SkpdTbl,
          attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
        }
      ],
      attributes: ['NIP', 'NAMA', 'KDSKPD']
    });

    // Buat map untuk lookup cepat
    const masterDataMap = new Map();
    allPegawai.forEach(p => {
      masterDataMap.set(p.NIP, {
        nama: p.NAMA,
        kdskpd: p.KDSKPD,
        skpd: p.SkpdTbl ? p.SkpdTbl.NMSKPD : null,
        status_skpd: p.SkpdTbl ? p.SkpdTbl.StatusSKPD : null
      });
    });

    // Gabungkan data tanpa Promise.all
    let usersWithMasterData = users.map(user => {
      const userData = user.toJSON();
      const masterData = masterDataMap.get(user.username);
      
      if (masterData) {
        userData.nama = masterData.nama;
        userData.nip = user.username;
        userData.kdskpd = masterData.kdskpd;
        userData.skpd = masterData.skpd;
        userData.status_skpd = masterData.status_skpd;
      } else {
        userData.nama = null;
        userData.nip = user.username;
        userData.kdskpd = null;
        userData.skpd = null;
        userData.status_skpd = null;
      }
      
      return userData;
    });

    // Filter berdasarkan SKPD jika ada
    if (id_skpd) {
      usersWithMasterData = usersWithMasterData.filter(user => 
        user.kdskpd === id_skpd
      );
    }

    res.json({
      data: usersWithMasterData,
      filter: id_skpd ? { id_skpd } : null
    });
  } 
  catch (error) {
    console.error('SearchUsers Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Dapatkan data user
    const user = await User.findOne({
      where: { id },
      attributes: { exclude: ["password_hash"] }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // Dapatkan data pegawai dari database master berdasarkan NIP
    const pegawai = await MstPegawai.findOne({
      where: { NIP: user.username }
    });

    // Dapatkan lokasi berdasarkan SKPD/Satker/Bidang pegawai
    let lokasiList = [];
    let skpdInfo = null;

    if (pegawai) {
      skpdInfo = {
        kdskpd: pegawai.KDSKPD,
        nama_pegawai: pegawai.NAMA,
        pangkat: pegawai.KDPANGKAT,
        jabatan: pegawai.JENIS_JABATAN
      };

      // Dapatkan lokasi berdasarkan SKPD/Satker/Bidang
      lokasiList = await Lokasi.findAll({
        where: {
          [Op.or]: [
            { id_skpd: pegawai.KDSKPD },
            { id_satker: pegawai.KDSATKER },
            { id_bidang: pegawai.KDBIDANG }
          ],
          status: true
        }
      });
    }

    // Format response
    const response = {
      ...user.toJSON(),
      skpd_info: skpdInfo,
      lokasi_list: lokasiList,
      lokasi_count: lokasiList.length
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
  const { fcm_token } = req.body;

  if (!fcm_token) return res.status(400).json({ error: 'Token wajib' });

  await User.update({ fcm_token: fcm_token }, { where: { username: username } });

  res.json({ success: true });
};

// Mendapatkan lokasi user berdasarkan SKPD/Satker/Bidang
const getMyLocation = async (req, res) => {
  try {
    const userNip = req.user.username;
    
    // Dapatkan data pegawai dari database master berdasarkan NIP
    const pegawai = await MstPegawai.findOne({
      where: { NIP: userNip }
    });

    if (!pegawai) {
      return res.status(404).json({ 
        message: "Data pegawai tidak ditemukan" 
      });
    }

    console.log(pegawai);
    // Ambil lokasi berdasarkan SKPD/Satker/Bidang pegawai
    const lokasi = await Lokasi.findAll({
      where: {
        [Op.or]: [
          { id_skpd: pegawai.KDSKPD },
          { id_satker: pegawai.KDSATKER },
          { id_bidang: pegawai.BIDANGF }
        ],
        status: true
      }
    });

    console.log(lokasi,">>>>>>>>>>>>>>>>>>>>>>>>>>>>");

    return res.status(200).json({
      data: lokasi,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      message: "Terjadi kesalahan server" 
    });
  }
};

module.exports = { getUser, getAllUser, getUserById, updateUser, updateUserByAdmin, searchUsers, saveFcmToken, getMyLocation };