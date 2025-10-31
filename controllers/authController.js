require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateTokens, verifyRefreshToken } = require("../utils/jwtUtils");
const { User, AdmOpd, AdmUpt, DeviceResetRequest } = require("../models/index");
const { SkpdTbl, SatkerTbl, BidangTbl } = require("../models/index");
const { Op } = require("sequelize");

const register = async (req, res) => {
  try {
    const { username, email, password, level, id_opd, id_upt, status } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const auth_key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const user = await User.create({ 
      username, 
      email, 
      password_hash: hashedPassword, 
      auth_key,
      level: level || 'user',
      id_opd,
      id_upt,
      status: status || 'active',
      device_id: null
    });
    
    res.status(201).json({ 
      message: "User berhasil didaftarkan", 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        level: user.level,
        status: user.status
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(req.body);
    console.log(req.headers.device_id);
    
    // Find user with related admin data
    const user = await User.findOne({ 
      where: { username },
      include: [
        {
          model: AdmOpd,
          required: false
        },
        {
          model: AdmUpt,
          required: false
        }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ error: "Username atau password salah" });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: "Username atau password salah" });
    }

    const device_id = req.headers.device_id;
    
    // Untuk level 1,2,3 (superadmin, admin_opd, admin_upt) tidak perlu device_id check
    const isAdminLevel = ['1', '2', '3'].includes(user.level);
    
    if (!isAdminLevel) {
      // Cek apakah device_id sudah digunakan oleh akun lain (hanya untuk pegawai biasa)
      if (device_id) {
        const existingUserWithDevice = await User.findOne({ 
          where: { 
            device_id: device_id,
            id: { [Op.ne]: user.id } // Exclude current user
          } 
        });
        
        if (existingUserWithDevice) {
          return res.status(401).json({ 
            error: "Device ID ini sudah digunakan oleh akun lain" 
          });
        }
      }

      if (!user.device_id && req.headers.device_id) {
        await user.update({ device_id: req.headers.device_id });
      }

      if (user.device_id && device_id && user.device_id !== device_id) {
        return res.status(401).json({ error: "Akun ini digunakan di perangkat lain" });
      }
    }
    
    // Generate JWT tokens
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      level: user.level
    };
    
    const { accessToken, refreshToken } = generateTokens(tokenPayload);
    
    // Simpan refresh token ke database
    await user.update({ refresh_token: refreshToken });
    
    console.log("masuk")

    // Prepare response with related data
    const responseData = {
      message: "Login berhasil",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        level: user.level,
        status: user.status,
        device_id: user.device_id
      }
    };

    // Add admin OPD data if exists
    if (user.AdmOpd) {
      const adminOpdData = {
        admopd_id: user.AdmOpd.admopd_id,
        id_skpd: user.AdmOpd.id_skpd,
        id_satker: user.AdmOpd.id_satker,
        id_bidang: user.AdmOpd.id_bidang,
        kategori: user.AdmOpd.kategori
      };

      // Manually fetch related SKPD data
      if (user.AdmOpd.id_skpd) {
        try {
          console.log('Searching for SKPD with KDSKPD:', user.AdmOpd.id_skpd);
          const skpdData = await SkpdTbl.findOne({
            where: { KDSKPD: user.AdmOpd.id_skpd }
          });
          console.log('SKPD data found:', skpdData ? skpdData.dataValues : 'null');
          if (skpdData) {
            adminOpdData.skpd = {
              KDSKPD: skpdData.KDSKPD,
              NMSKPD: skpdData.NMSKPD,
              StatusSKPD: skpdData.StatusSKPD
            };
          }
        } catch (error) {
          console.error('Error fetching SKPD data:', error);
          adminOpdData.skpd = null;
        }
      }

      // Manually fetch related Satker data
      if (user.AdmOpd.id_satker) {
        try {
          console.log('Searching for Satker with KDSATKER:', user.AdmOpd.id_satker);
          const satkerData = await SatkerTbl.findOne({
            where: { KDSATKER: user.AdmOpd.id_satker }
          });
          console.log('Satker data found:', satkerData ? satkerData.dataValues : 'null');
          if (satkerData) {
            adminOpdData.satker = {
              KDSATKER: satkerData.KDSATKER,
              NMSATKER: satkerData.NMSATKER,
              NAMA_JABATAN: satkerData.NAMA_JABATAN,
              STATUS_SATKER: satkerData.STATUS_SATKER
            };
          } else {
            adminOpdData.satker = null;
          }
        } catch (error) {
          console.error('Error fetching Satker data:', error);
          adminOpdData.satker = null;
        }
      }

      // Manually fetch related Bidang data
      if (user.AdmOpd.id_bidang) {
        try {
          const bidangData = await BidangTbl.findOne({
            where: { BIDANGF: user.AdmOpd.id_bidang }
          });
          if (bidangData) {
            adminOpdData.bidang = {
              BIDANGF: bidangData.BIDANGF,
              NMBIDANG: bidangData.NMBIDANG,
              NAMA_JABATAN: bidangData.NAMA_JABATAN,
              STATUS_BIDANG: bidangData.STATUS_BIDANG
            };
          }
        } catch (error) {
          console.error('Error fetching Bidang data:', error);
          adminOpdData.bidang = null;
        }
      }

      responseData.admin_opd = adminOpdData;
    }

    // Add admin UPT data if exists
    if (user.AdmUpt) {
      const adminUptData = {
        admupt_id: user.AdmUpt.admupt_id,
        id_skpd: user.AdmUpt.id_skpd,
        id_satker: user.AdmUpt.id_satker,
        id_bidang: user.AdmUpt.id_bidang,
        kategori: user.AdmUpt.kategori,
        umum: user.AdmUpt.umum
      };

      // Manually fetch related SKPD data
      if (user.AdmUpt.id_skpd) {
        try {
          const skpdData = await SkpdTbl.findOne({
            where: { KDSKPD: user.AdmUpt.id_skpd }
          });
          if (skpdData) {
            adminUptData.skpd = {
              KDSKPD: skpdData.KDSKPD,
              NMSKPD: skpdData.NMSKPD,
              StatusSKPD: skpdData.StatusSKPD
            };
          }
        } catch (error) {
          console.error('Error fetching SKPD data for UPT:', error);
          adminUptData.skpd = null;
        }
      }

      // Manually fetch related Satker data
      if (user.AdmUpt.id_satker) {
        try {
          const satkerData = await SatkerTbl.findOne({
            where: { KDSATKER: user.AdmUpt.id_satker }
          });
          if (satkerData) {
            adminUptData.satker = {
              KDSATKER: satkerData.KDSATKER,
              NMSATKER: satkerData.NMSATKER,
              NAMA_JABATAN: satkerData.NAMA_JABATAN,
              STATUS_SATKER: satkerData.STATUS_SATKER
            };
          }
        } catch (error) {
          console.error('Error fetching Satker data for UPT:', error);
          adminUptData.satker = null;
        }
      }

      // Manually fetch related Bidang data
      if (user.AdmUpt.id_bidang) {
        try {
          const bidangData = await BidangTbl.findOne({
            where: { BIDANGF: user.AdmUpt.id_bidang }
          });
          if (bidangData) {
            adminUptData.bidang = {
              BIDANGF: bidangData.BIDANGF,
              NMBIDANG: bidangData.NMBIDANG,
              NAMA_JABATAN: bidangData.NAMA_JABATAN,
              STATUS_BIDANG: bidangData.STATUS_BIDANG
            };
          }
        } catch (error) {
          console.error('Error fetching Bidang data for UPT:', error);
          adminUptData.bidang = null;
        }
      }

      responseData.admin_upt = adminUptData;
    }

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(req.body);
    
    // Find user with related admin data
    const user = await User.findOne({ 
      where: { username },
      include: [
        {
          model: AdmOpd,
          required: false
        },
        {
          model: AdmUpt,
          required: false
        }
      ]
    });
    console.log(user);
    
    if (!user) {
      return res.status(401).json({ error: "Username atau password salah" });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: "Username atau password salah" });
    }

    // Cek apakah user adalah admin (level 1, 2, atau 3)
    const adminLevel = ['1', '2', '3'].includes(user.level);
    if (!adminLevel) {
      return res.status(401).json({ error: "Akun ini bukan admin" });
    }

    
    
    // Generate JWT tokens
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      level: user.level,
      adminOpdId: user.AdmOpd?.admopd_id || null,
      adminUptId: user.AdmUpt?.admupt_id || null
    };
    
    const { accessToken, refreshToken } = generateTokens(tokenPayload);
    
    // Simpan refresh token ke database
    await user.update({ refresh_token: refreshToken });
    
    console.log("Admin login berhasil")

    // Prepare response with related data
    const responseData = {
      message: "Login admin berhasil",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        level: user.level,
        status: user.status,
        device_id: user.device_id
      },
      admin_opd: user.AdmOpd ? {
        admopd_id: user.AdmOpd.admopd_id,
        id_skpd: user.AdmOpd.id_skpd,
        id_satker: user.AdmOpd.id_satker,
        id_bidang: user.AdmOpd.id_bidang,
        kategori: user.AdmOpd.kategori
      } : null
    };

    // Add admin UPT data if exists
    if (user.AdmUpt) {
      responseData.admin_upt = {
        admupt_id: user.AdmUpt.admupt_id,
        id_skpd: user.AdmUpt.id_skpd,
        id_satker: user.AdmUpt.id_satker,
        id_bidang: user.AdmUpt.id_bidang,
        kategori: user.AdmUpt.kategori,
        umum: user.AdmUpt.umum
      };
    }

    res.json(responseData);
  } catch (error) {
    console.error('Login Admin Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Refresh Access Token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    console.log('Refresh Token:', token);
    
    if (!token) {
      return res.status(401).json({ 
        error: "Refresh token diperlukan",
        code: "REFRESH_TOKEN_REQUIRED"
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);
    
    // Cari user dan verify refresh token di database
    const user = await User.findOne({
      where: {
        id: decoded.userId,
        refresh_token: token
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: "Refresh token tidak valid",
        code: "INVALID_REFRESH_TOKEN"
      });
    }



    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      level: user.level
    };
    
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);
    
    // Update refresh token di database
    await user.update({ refresh_token: newRefreshToken });

    res.json({
      message: "Token berhasil di-refresh",
      accessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Refresh Token Error:', error);
    
    if (error.message === 'Invalid refresh token' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: "Refresh token tidak valid atau sudah kadaluarsa",
        code: "REFRESH_TOKEN_EXPIRED"
      });
    }
    
    res.status(500).json({ error: "Internal server error" });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        error: "Refresh token diperlukan untuk logout",
        code: "REFRESH_TOKEN_REQUIRED"
      });
    }

    // Hapus refresh token dari database
    const user = await User.findOne({
      where: { refresh_token: token }
    });

    if (user) {
      await user.update({ refresh_token: null });
    }

    res.json({ 
      message: "Logout berhasil" 
    });

  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Logout from all devices
const logoutAll = async (req, res) => {
  try {
    const userId = req.user.id; // Dari JWT middleware
    
    // Hapus semua refresh token untuk user ini
    await User.update(
      { refresh_token: null },
      { where: { id: userId } }
    );

    res.json({ 
      message: "Logout dari semua perangkat berhasil" 
    });

  } catch (error) {
    console.error('Logout All Error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Force logout user (untuk admin atau sistem)
const forceLogoutUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        error: "User ID diperlukan",
        code: "USER_ID_REQUIRED"
      });
    }

    // Cek apakah user ada
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        error: "User tidak ditemukan",
        code: "USER_NOT_FOUND"
      });
    }

    // Hapus refresh token dan reset device_id
    await user.update({
      refresh_token: null,
      device_id: null
    });

    res.json({ 
      message: "User berhasil di-logout paksa dari semua perangkat",
      success: true
    });

  } catch (error) {
    console.error('Force Logout User Error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const checkResetRequest = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password harus diisi" });
    }
    
    // Find user
    const user = await User.findOne({ 
      where: { username }
    });
    
    if (!user) {
      return res.status(401).json({ error: "Username atau password salah" });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: "Username atau password salah" });
    }
    
    // Get reset requests for this user (maksimal 3 permintaan terbaru)
    const requests = await DeviceResetRequest.findAll({
      where: { user_id: user.id },
      order: [['created_at', 'DESC']],
      limit: 3,
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

    res.json({
      message: "Reset requests berhasil diambil",
      data: requests
    });

  } catch (error) {
    console.error('Check Reset Request Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, loginAdmin, refreshToken, logout, logoutAll, forceLogoutUser, checkResetRequest };