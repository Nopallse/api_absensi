const { SatkerTbl, SkpdTbl, BidangTbl, MstPegawai, AdmOpd, AdmUpt, User } = require("../models");
const Sequelize = require("sequelize");

// Get all Satker with employee count and admin info
const getAllSatker = async (req, res) => {
  try {
    // Ambil parameter pagination dari query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Filter berdasarkan SKPD jika ada
    const { kdskpd } = req.query;
    const whereClause = kdskpd ? { KDSKPD: kdskpd } : {};

    // Hitung total data untuk informasi pagination
    const totalSatker = await SatkerTbl.count({ where: whereClause });
    const totalPages = Math.ceil(totalSatker / limit);

    // Ambil data Satker dengan pagination
    const satkerList = await SatkerTbl.findAll({
      where: whereClause,
      include: [
        {
          model: SkpdTbl,
          attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
        }
      ],
      limit: limit,
      offset: offset,
      order: [['KDSATKER', 'ASC']]
    });

    // Tambahkan informasi jumlah karyawan dan admin untuk setiap Satker
    const satkerWithDetails = await Promise.all(
      satkerList.map(async (satker) => {
        const satkerData = satker.toJSON();
        
        try {
          // Hitung jumlah karyawan dari database master
          const employeeCount = await MstPegawai.count({
            where: { KDSATKER: satker.KDSATKER }
          });

          // Ambil admin OPD dari database utama
          const adminOpd = await AdmOpd.findAll({
            where: { id_satker: satker.KDSATKER },
            include: [
              {
                model: User,
                attributes: ['id', 'username', 'email', 'level', 'status']
              }
            ]
          });

          // Ambil admin UPT dari database utama
          const adminUpt = await AdmUpt.findAll({
            where: { id_satker: satker.KDSATKER },
            include: [
              {
                model: User,
                attributes: ['id', 'username', 'email', 'level', 'status']
              }
            ]
          });

          // Format data admin
          const adminOpdList = adminOpd.map(admin => ({
            id: admin.User.id,
            username: admin.User.username,
            email: admin.User.email,
            level: admin.User.level,
            status: admin.User.status,
            kategori: admin.kategori,
            type: 'admin_opd'
          }));

          const adminUptList = adminUpt.map(admin => ({
            id: admin.User.id,
            username: admin.User.username,
            email: admin.User.email,
            level: admin.User.level,
            status: admin.User.status,
            kategori: admin.kategori,
            umum: admin.umum,
            type: 'admin_upt'
          }));

          const allAdmins = [...adminOpdList, ...adminUptList];

          // Hitung jumlah bidang
          const bidangCount = await BidangTbl.count({
            where: { KDSATKER: satker.KDSATKER }
          });

          return {
            ...satkerData,
            employee_count: employeeCount,
            admin_count: allAdmins.length,
            admins: allAdmins,
            bidang_count: bidangCount
          };
        } catch (error) {
          console.error(`Error getting details for Satker ${satker.KDSATKER}:`, error);
          return {
            ...satkerData,
            employee_count: 0,
            admin_count: 0,
            admins: [],
            bidang_count: 0
          };
        }
      })
    );

    // Kirim response dengan informasi pagination
    res.json({
      data: satkerWithDetails,
      pagination: {
        totalItems: totalSatker,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      filter: kdskpd ? { kdskpd } : null
    });
  } catch (error) {
    console.error('GetAllSatker Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Search Satker by KDSATKER or NMSATKER
const searchSatker = async (req, res) => {
  try {
    const { query } = req.query;

    // Build where clause - if no query, get all satker
    let whereClause = {};
    
    if (query) {
      whereClause = {
        [Sequelize.Op.or]: [
          { KDSATKER: { [Sequelize.Op.like]: `%${query}%` } },
          { NMSATKER: { [Sequelize.Op.like]: `%${query}%` } },
        ],
      };
    }

    const satkerList = await SatkerTbl.findAll({
      where: whereClause,
      include: [
        {
          model: SkpdTbl,
          attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
        }
      ],
      order: [['KDSATKER', 'ASC']]
    });

    if (satkerList.length === 0) {
      const errorMessage = query 
        ? "Satker tidak ditemukan" 
        : "Tidak ada Satker tersedia";
        
      return res.status(404).json({ 
        error: errorMessage,
        searchQuery: query || null
      });
    }

    // Tambahkan informasi detail
    const satkerWithDetails = await Promise.all(
      satkerList.map(async (satker) => {
        const satkerData = satker.toJSON();
        
        try {
          // Hitung jumlah karyawan
          const employeeCount = await MstPegawai.count({
            where: { KDSATKER: satker.KDSATKER }
          });

          // Ambil admin
          const adminOpd = await AdmOpd.findAll({
            where: { id_satker: satker.KDSATKER },
            include: [{ model: User, attributes: ['id', 'username', 'email', 'level', 'status'] }]
          });

          const adminUpt = await AdmUpt.findAll({
            where: { id_satker: satker.KDSATKER },
            include: [{ model: User, attributes: ['id', 'username', 'email', 'level', 'status'] }]
          });

          const allAdmins = [
            ...adminOpd.map(admin => ({ ...admin.User.toJSON(), kategori: admin.kategori, type: 'admin_opd' })),
            ...adminUpt.map(admin => ({ ...admin.User.toJSON(), kategori: admin.kategori, umum: admin.umum, type: 'admin_upt' }))
          ];

          const bidangCount = await BidangTbl.count({
            where: { KDSATKER: satker.KDSATKER }
          });

          return {
            ...satkerData,
            employee_count: employeeCount,
            admin_count: allAdmins.length,
            admins: allAdmins,
            bidang_count: bidangCount
          };
        } catch (error) {
          console.error(`Error getting details for Satker ${satker.KDSATKER}:`, error);
          return {
            ...satkerData,
            employee_count: 0,
            admin_count: 0,
            admins: [],
            bidang_count: 0
          };
        }
      })
    );

    res.json({
      data: satkerWithDetails,
      searchQuery: query || null
    });
  } catch (error) {
    console.error('SearchSatker Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get Satker by ID
const getSatkerById = async (req, res) => {
  try {
    const { kdsatker } = req.params;
    
    const satker = await SatkerTbl.findByPk(kdsatker, {
      include: [
        {
          model: SkpdTbl,
          attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
        },
        {
          model: BidangTbl,
          attributes: ['BIDANGF', 'NMBIDANG', 'NAMA_JABATAN', 'STATUS_BIDANG']
        }
      ]
    });
    
    if (!satker) {
      return res.status(404).json({ error: "Satker tidak ditemukan" });
    }

    try {
      // Hitung jumlah karyawan
      const employeeCount = await MstPegawai.count({
        where: { KDSATKER: kdsatker }
      });

      // Ambil admin
      const adminOpd = await AdmOpd.findAll({
        where: { id_satker: kdsatker },
        include: [{ model: User, attributes: ['id', 'username', 'email', 'level', 'status'] }]
      });

      const adminUpt = await AdmUpt.findAll({
        where: { id_satker: kdsatker },
        include: [{ model: User, attributes: ['id', 'username', 'email', 'level', 'status'] }]
      });

      const allAdmins = [
        ...adminOpd.map(admin => ({ ...admin.User.toJSON(), kategori: admin.kategori, type: 'admin_opd' })),
        ...adminUpt.map(admin => ({ ...admin.User.toJSON(), kategori: admin.kategori, umum: admin.umum, type: 'admin_upt' }))
      ];

      const satkerData = satker.toJSON();
      res.json({
        ...satkerData,
        employee_count: employeeCount,
        admin_count: allAdmins.length,
        admins: allAdmins,
        bidang_count: satkerData.BidangTbls ? satkerData.BidangTbls.length : 0,
        bidang_list: satkerData.BidangTbls || []
      });
    } catch (error) {
      console.error(`Error getting details for Satker ${kdsatker}:`, error);
      res.json({
        ...satker.toJSON(),
        employee_count: 0,
        admin_count: 0,
        admins: [],
        bidang_count: 0,
        bidang_list: []
      });
    }
  } catch (error) {
    console.error('GetSatkerById Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get Satker by SKPD
const getSatkerBySkpd = async (req, res) => {
  try {
    const { kdskpd } = req.params;
    
    const satkerList = await SatkerTbl.findAll({
      where: { KDSKPD: kdskpd },
      include: [
        {
          model: SkpdTbl,
          attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
        }
      ],
      order: [['KDSATKER', 'ASC']]
    });

    if (satkerList.length === 0) {
      return res.status(404).json({ error: "Tidak ada Satker ditemukan untuk SKPD ini" });
    }

    // Tambahkan informasi detail
    const satkerWithDetails = await Promise.all(
      satkerList.map(async (satker) => {
        const satkerData = satker.toJSON();
        
        try {
          const employeeCount = await MstPegawai.count({
            where: { KDSATKER: satker.KDSATKER }
          });

          const bidangCount = await BidangTbl.count({
            where: { KDSATKER: satker.KDSATKER }
          });

          return {
            ...satkerData,
            employee_count: employeeCount,
            bidang_count: bidangCount
          };
        } catch (error) {
          console.error(`Error getting details for Satker ${satker.KDSATKER}:`, error);
          return {
            ...satkerData,
            employee_count: 0,
            bidang_count: 0
          };
        }
      })
    );

    res.json({
      data: satkerWithDetails,
      kdskpd: kdskpd
    });
  } catch (error) {
    console.error('GetSatkerBySkpd Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  getAllSatker, 
  searchSatker, 
  getSatkerById, 
  getSatkerBySkpd
};
