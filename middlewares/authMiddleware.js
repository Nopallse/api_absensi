const { verifyAccessToken } = require('../utils/jwtUtils');
const { User, AdmOpd, AdmUpt } = require('../models');

// Middleware universal untuk authentication dan authorization
const authMiddleware = (options = {}) => {
  return async (req, res, next) => {
    try {
      let user = null;
      
      // Cek JWT token dulu
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = verifyAccessToken(token);
          
          user = await User.findByPk(decoded.userId);
          
          if (!user) {
            return res.status(401).json({
              error: 'User tidak ditemukan',
              code: 'USER_NOT_FOUND'
            });
          }
          
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            level: user.level,
            device_id: user.device_id
          };


          // Validasi level jika diperlukan
          if (options.requireLevel && !checkUserLevel(user.level, options.requireLevel)) {
            console.log('Level user:', user.level);
            console.log('username:', user.username);
            return res.status(403).json({
              error: 'Akses ditolak. Level akses tidak mencukupi',
              code: 'INSUFFICIENT_LEVEL',
              required: options.requireLevel,
              current: user.level,
              username: user.username
            });
          }
          
          // Jika memerlukan admin OPD, ambil data admin OPD
          if (options.requireAdminOpd && user.level === '2') {
            const adminOpd = await AdmOpd.findOne({ 
              where: { id_user: user.id }
            });
            
            if (!adminOpd) {
              return res.status(403).json({ 
                error: 'Data admin OPD tidak ditemukan',
                code: 'ADMIN_OPD_DATA_NOT_FOUND'
              });
            }
            
            req.adminOpd = adminOpd;
          }

          // Jika memerlukan admin UPT, ambil data admin UPT
          if (options.requireAdminUpt && user.level === '3') {
            const adminUpt = await AdmUpt.findOne({ 
              where: { id_user: user.id }
            });
            
            if (!adminUpt) {
              return res.status(403).json({ 
                error: 'Data admin UPT tidak ditemukan',
                code: 'ADMIN_UPT_DATA_NOT_FOUND'
              });
            }
            
            req.adminUpt = adminUpt;
          }
          
          return next();
        } catch (jwtError) {
          // PENTING: Jika user mengirim Bearer token tapi invalid/expired,
          // JANGAN fallback ke device_id - langsung return error
          console.error('JWT Error:', jwtError.message);
          return res.status(401).json({ 
            error: 'Access token tidak valid atau sudah kadaluarsa',
            code: 'TOKEN_EXPIRED',
            details: jwtError.message
          });
        }
      }
      
      // Fallback ke device ID authentication (untuk backward compatibility)
      if (options.allowDeviceAuth !== false) {
        const deviceId = req.headers['x-device-id'];
        if (!deviceId) {
          return res.status(401).json({ 
            error: "Authentication diperlukan. Gunakan Bearer token atau Device ID",
            code: "AUTH_REQUIRED"
          });
        }

        user = await User.findOne({ where: { device_id: deviceId } });
        if (!user) {
          return res.status(401).json({ 
            error: "User tidak ditemukan dengan device ID ini",
            code: "USER_NOT_FOUND"
          });
        }
        


        // Validasi level jika diperlukan
        if (options.requireLevel && !checkUserLevel(user.level, options.requireLevel)) {
          console.log('Level user:', user.level);
          console.log('username:', user.username);
          return res.status(403).json({
            error: 'Akses ditolak. Level akses tidak mencukupi',
            code: 'INSUFFICIENT_LEVEL',
            required: options.requireLevel,
            current: user.level,
            username: user.username
          });
        }

        // Set user object untuk device auth
        req.user = user;
        
        // Jika memerlukan admin OPD, ambil data admin OPD
        if (options.requireAdminOpd && user.level === '2') {
          const adminOpd = await AdmOpd.findOne({ 
            where: { id_user: user.id }
          });
          
          if (!adminOpd) {
            return res.status(403).json({ 
              error: 'Data admin OPD tidak ditemukan',
              code: 'ADMIN_OPD_DATA_NOT_FOUND'
            });
          }
          
          req.adminOpd = adminOpd;
        }

        // Jika memerlukan admin UPT, ambil data admin UPT
        if (options.requireAdminUpt && user.level === '3') {
          const adminUpt = await AdmUpt.findOne({ 
            where: { id_user: user.id }
          });
          
          if (!adminUpt) {
            return res.status(403).json({ 
              error: 'Data admin UPT tidak ditemukan',
              code: 'ADMIN_UPT_DATA_NOT_FOUND'
            });
          }
          
          req.adminUpt = adminUpt;
        }
        
        next();
      } else {
        return res.status(401).json({ 
          error: "Access token diperlukan",
          code: "TOKEN_REQUIRED"
        });
      }
      
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      res.status(500).json({ error: "Kesalahan server internal" });
    }
  };
};

// Helper function untuk cek level user
const checkUserLevel = (userLevel, requiredLevel) => {
  const levelMap = {
    '1': 'superadmin',
    '2': 'admin_opd', 
    '3': 'admin_upt',
    'default': 'pegawai'
  };
  
  const currentLevel = levelMap[userLevel] || levelMap['default'];
  
  // Jika array level yang diizinkan
  if (Array.isArray(requiredLevel)) {
    return requiredLevel.some(level => {
      if (typeof level === 'string') {
        // Jika level berupa string angka (seperti "1"), bandingkan dengan userLevel langsung
        if (['1', '2', '3'].includes(level)) {
          return userLevel === level;
        }
        // Jika level berupa nama (seperti "superadmin"), bandingkan dengan currentLevel
        return currentLevel === level;
      } else if (typeof level === 'number') {
        return userLevel === level.toString();
      }
      return false;
    });
  }
  
  // Jika single level
  if (typeof requiredLevel === 'string') {
    // Jika requiredLevel berupa string angka (seperti "1"), bandingkan dengan userLevel langsung
    if (['1', '2', '3'].includes(requiredLevel)) {
      return userLevel === requiredLevel;
    }
    // Jika requiredLevel berupa nama (seperti "superadmin"), bandingkan dengan currentLevel
    return currentLevel === requiredLevel;
  } else if (typeof requiredLevel === 'number') {
    return userLevel === requiredLevel.toString();
  }
  
  return false;
};

// Middleware khusus untuk mengecek device_id user (bukan admin)
const requireUserDeviceCheck = () => {
  return async (req, res, next) => {
    try {
      // Hanya berlaku untuk user biasa (level bukan 1, 2, 3)
      if (['1', '2', '3'].includes(req.user.level)) {
        return next(); // Admin tidak perlu pengecekan device_id
      }

      const deviceId = req.headers['x-device-id'];
      
      if (!deviceId) {
        return res.status(401).json({ 
          error: "Device ID diperlukan untuk user",
          code: "DEVICE_ID_REQUIRED"
        });
      }

      // Cek apakah device_id cocok dengan yang ada di database
      if (req.user.device_id !== deviceId) {
        // Jika tidak cocok, hapus refresh_token untuk logout paksa
        await User.update(
          { refresh_token: null },
          { where: { id: req.user.id } }
        );

        return res.status(401).json({ 
          error: "Device ID tidak cocok. Anda telah di-logout dari semua perangkat. Silakan login ulang.",
          code: "DEVICE_ID_MISMATCH"
        });
      }

      next();
    } catch (error) {
      console.error("User Device Check Error:", error);
      res.status(500).json({ error: "Kesalahan server internal" });
    }
  };
};

// Shortcut functions untuk kemudahan penggunaan
const requireSuperAdmin = () => authMiddleware({ requireLevel: ['1'] });
const requireAdminOpd = () => authMiddleware({ requireLevel: ['1', '2'], requireAdminOpd: true });
const requireAdminUpt = () => authMiddleware({ requireLevel: ['1', '3'], requireAdminUpt: true });
const requireAuth = () => authMiddleware({ allowDeviceAuth: true });
const requireJWT = () => authMiddleware({ allowDeviceAuth: false });

module.exports = {
  authMiddleware,
  requireSuperAdmin,
  requireAdminOpd, 
  requireAdminUpt,
  requireAuth,
  requireJWT,
  requireUserDeviceCheck
};
