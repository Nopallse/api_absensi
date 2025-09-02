const { SkpdTbl, AdmOpd, User, MstPegawai, SkpdLokasi, Lokasi } = require("../models");
const Sequelize = require("sequelize");

// Get all SKPD with employee count and admin info
const getAllSkpd = async (req, res) => {
  try {
    // Ambil parameter pagination dari query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Hitung total data untuk informasi pagination
    const totalSkpd = await SkpdTbl.count();
    const totalPages = Math.ceil(totalSkpd / limit);

    // Ambil data SKPD dengan pagination
    const skpdList = await SkpdTbl.findAll({
      limit: limit,
      offset: offset,
      order: [['KDSKPD', 'ASC']]
    });

    // Tambahkan informasi jumlah karyawan dan admin untuk setiap SKPD
    const skpdWithDetails = await Promise.all(
      skpdList.map(async (skpd) => {
        const skpdData = skpd.toJSON();
        
        try {
          // Hitung jumlah karyawan dari database master
          const employeeCount = await MstPegawai.count({
            where: { KDSKPD: skpd.KDSKPD }
          });

          // Ambil admin dari database utama
          const admins = await AdmOpd.findAll({
            where: { id_skpd: skpd.KDSKPD },
            include: [
              {
                model: User,
                attributes: ['id', 'username', 'email', 'level', 'status']
              }
            ]
          });

          // Format data admin
          const adminList = admins.map(admin => ({
            id: admin.User.id,
            username: admin.User.username,
            email: admin.User.email,
            level: admin.User.level,
            status: admin.User.status,
            kategori: admin.kategori
          }));

          return {
            ...skpdData,
            employee_count: employeeCount,
            admin_count: admins.length,
            admins: adminList
          };
        } catch (error) {
          console.error(`Error getting details for SKPD ${skpd.KDSKPD}:`, error);
          return {
            ...skpdData,
            employee_count: 0,
            admin_count: 0,
            admins: []
          };
        }
      })
    );

    // Kirim response dengan informasi pagination
    res.json({
      data: skpdWithDetails,
      pagination: {
        totalItems: totalSkpd,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('GetAllSkpd Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Search SKPD by KDSKPD or NMSKPD
const searchSkpd = async (req, res) => {
  try {
    const { query } = req.query;

    // Build where clause - if no query, get all SKPD
    let whereClause = {};
    
    if (query) {
      whereClause = {
        [Sequelize.Op.or]: [
          { KDSKPD: { [Sequelize.Op.like]: `%${query}%` } },
          { NMSKPD: { [Sequelize.Op.like]: `%${query}%` } },
        ],
      };
    }

    const skpdList = await SkpdTbl.findAll({
      where: whereClause,
      order: [['KDSKPD', 'ASC']]
    });

    if (skpdList.length === 0) {
      const errorMessage = query 
        ? "SKPD tidak ditemukan" 
        : "Tidak ada SKPD tersedia";
        
      return res.status(404).json({ 
        error: errorMessage,
        searchQuery: query || null
      });
    }

    // Tambahkan informasi jumlah karyawan dan admin
    const skpdWithDetails = await Promise.all(
      skpdList.map(async (skpd) => {
        const skpdData = skpd.toJSON();
        
        try {
          // Hitung jumlah karyawan
          const employeeCount = await MstPegawai.count({
            where: { KDSKPD: skpd.KDSKPD }
          });

          // Ambil admin
          const admins = await AdmOpd.findAll({
            where: { id_skpd: skpd.KDSKPD },
            include: [
              {
                model: User,
                attributes: ['id', 'username', 'email', 'level', 'status']
              }
            ]
          });

          const adminList = admins.map(admin => ({
            id: admin.User.id,
            username: admin.User.username,
            email: admin.User.email,
            level: admin.User.level,
            status: admin.User.status,
            kategori: admin.kategori
          }));

          return {
            ...skpdData,
            employee_count: employeeCount,
            admin_count: admins.length,
            admins: adminList
          };
        } catch (error) {
          console.error(`Error getting details for SKPD ${skpd.KDSKPD}:`, error);
          return {
            ...skpdData,
            employee_count: 0,
            admin_count: 0,
            admins: []
          };
        }
      })
    );

    res.json({
      data: skpdWithDetails,
      searchQuery: query || null
    });
  } catch (error) {
    console.error('SearchSkpd Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get SKPD by ID
const getSkpdById = async (req, res) => {
  try {
    const { kdskpd } = req.params;
    
    const skpd = await SkpdTbl.findByPk(kdskpd);
    
    if (!skpd) {
      return res.status(404).json({ error: "SKPD tidak ditemukan" });
    }

    // Tambahkan informasi detail
    try {
      // Hitung jumlah karyawan
      const employeeCount = await MstPegawai.count({
        where: { KDSKPD: kdskpd }
      });

      // Ambil admin
      const admins = await AdmOpd.findAll({
        where: { id_skpd: kdskpd },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email', 'level', 'status']
          }
        ]
      });

      const adminList = admins.map(admin => ({
        id: admin.User.id,
        username: admin.User.username,
        email: admin.User.email,
        level: admin.User.level,
        status: admin.User.status,
        kategori: admin.kategori
      }));

      // Ambil daftar lokasi SKPD
      const skpdLokasi = await SkpdLokasi.findAll({
        where: { kdskpd },
        include: [{
          model: Lokasi,
          attributes: ['lokasi_id', 'lat', 'lng', 'range', 'ket', 'status']
        }]
      });

      const lokasiList = skpdLokasi.map(sl => sl.Lokasi);

      const skpdData = skpd.toJSON();
      res.json({
        ...skpdData,
        employee_count: employeeCount,
        admin_count: admins.length,
        admins: adminList,
        lokasi_count: lokasiList.length,
        lokasi_list: lokasiList
      });
    } catch (error) {
      console.error(`Error getting details for SKPD ${kdskpd}:`, error);
      res.json({
        ...skpd.toJSON(),
        employee_count: 0,
        admin_count: 0,
        admins: [],
        lokasi_count: 0,
        lokasi_list: []
      });
    }
  } catch (error) {
    console.error('GetSkpdById Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get SKPD by status
const getSkpdByStatus = async (req, res) => {
  try {
    const { status } = req.query;
    
    if (!status) {
      return res.status(400).json({ error: "Status parameter is required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Hitung total data untuk informasi pagination
    const totalSkpd = await SkpdTbl.count({
      where: { StatusSKPD: status }
    });
    const totalPages = Math.ceil(totalSkpd / limit);

    // Ambil data SKPD berdasarkan status
    const skpdList = await SkpdTbl.findAll({
      where: { StatusSKPD: status },
      limit: limit,
      offset: offset,
      order: [['KDSKPD', 'ASC']]
    });

    // Tambahkan informasi detail
    const skpdWithDetails = await Promise.all(
      skpdList.map(async (skpd) => {
        const skpdData = skpd.toJSON();
        
        try {
          // Hitung jumlah karyawan
          const employeeCount = await MstPegawai.count({
            where: { KDSKPD: skpd.KDSKPD }
          });

          // Ambil admin
          const admins = await AdmOpd.findAll({
            where: { id_skpd: skpd.KDSKPD },
            include: [
              {
                model: User,
                attributes: ['id', 'username', 'email', 'level', 'status']
              }
            ]
          });

          const adminList = admins.map(admin => ({
            id: admin.User.id,
            username: admin.User.username,
            email: admin.User.email,
            level: admin.User.level,
            status: admin.User.status,
            kategori: admin.kategori
          }));

          return {
            ...skpdData,
            employee_count: employeeCount,
            admin_count: admins.length,
            admins: adminList
          };
        } catch (error) {
          console.error(`Error getting details for SKPD ${skpd.KDSKPD}:`, error);
          return {
            ...skpdData,
            employee_count: 0,
            admin_count: 0,
            admins: []
          };
        }
      })
    );

    res.json({
      data: skpdWithDetails,
      pagination: {
        totalItems: totalSkpd,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      filter: { status }
    });
  } catch (error) {
    console.error('GetSkpdByStatus Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get available SKPD codes for filtering
const getAvailableSkpdCodes = async (req, res) => {
  try {
    const skpdCodes = await SkpdTbl.findAll({
      attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD'],
      order: [['KDSKPD', 'ASC']]
    });

    res.json({
      data: skpdCodes,
      total: skpdCodes.length
    });
  } catch (error) {
    console.error('GetAvailableSkpdCodes Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  getAllSkpd, 
  searchSkpd, 
  getSkpdById, 
  getSkpdByStatus,
  getAvailableSkpdCodes
}; 