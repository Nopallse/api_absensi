const { BidangTbl, SatkerTbl, SkpdTbl, MstPegawai, AdmOpd, AdmUpt, User } = require("../models");
const Sequelize = require("sequelize");

// Get all Bidang with employee count and admin info
const getAllBidang = async (req, res) => {
  try {
    // Ambil parameter pagination dari query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Filter berdasarkan SATKER jika ada
    const { kdsatker } = req.query;
    const whereClause = kdsatker ? { KDSATKER: kdsatker } : {};

    // Hitung total data untuk informasi pagination
    const totalBidang = await BidangTbl.count({ where: whereClause });
    const totalPages = Math.ceil(totalBidang / limit);

    // Ambil data Bidang dengan pagination
    const bidangList = await BidangTbl.findAll({
      where: whereClause,
      include: [
        {
          model: SatkerTbl,
          attributes: ['KDSATKER', 'NMSATKER', 'KDSKPD'],
          include: [
            {
              model: SkpdTbl,
              attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
            }
          ]
        }
      ],
      limit: limit,
      offset: offset,
      order: [['BIDANGF', 'ASC']]
    });

    // Tambahkan informasi jumlah karyawan dan admin untuk setiap Bidang
    const bidangWithDetails = await Promise.all(
      bidangList.map(async (bidang) => {
        const bidangData = bidang.toJSON();
        
        try {
          // Hitung jumlah karyawan dari database master berdasarkan KDBIDANG
          const employeeCount = await MstPegawai.count({
            where: { KDBIDANG: bidang.BIDANGF }
          });

          // Ambil admin OPD dari database utama
          const adminOpd = await AdmOpd.findAll({
            where: { id_bidang: bidang.BIDANGF },
            include: [
              {
                model: User,
                attributes: ['id', 'username', 'email', 'level', 'status']
              }
            ]
          });

          // Ambil admin UPT dari database utama
          const adminUpt = await AdmUpt.findAll({
            where: { id_bidang: bidang.BIDANGF },
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

          return {
            ...bidangData,
            employee_count: employeeCount,
            admin_count: allAdmins.length,
            admins: allAdmins
          };
        } catch (error) {
          console.error(`Error getting details for Bidang ${bidang.BIDANGF}:`, error);
          return {
            ...bidangData,
            employee_count: 0,
            admin_count: 0,
            admins: []
          };
        }
      })
    );

    // Kirim response dengan informasi pagination
    res.json({
      data: bidangWithDetails,
      pagination: {
        totalItems: totalBidang,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      filter: kdsatker ? { kdsatker } : null
    });
  } catch (error) {
    console.error('GetAllBidang Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Search Bidang by BIDANGF or NMBIDANG
const searchBidang = async (req, res) => {
  try {
    const { query } = req.query;

    // Build where clause - if no query, get all bidang
    let whereClause = {};
    
    if (query) {
      whereClause = {
        [Sequelize.Op.or]: [
          { BIDANGF: { [Sequelize.Op.like]: `%${query}%` } },
          { NMBIDANG: { [Sequelize.Op.like]: `%${query}%` } },
        ],
      };
    }

    const bidangList = await BidangTbl.findAll({
      where: whereClause,
      include: [
        {
          model: SatkerTbl,
          attributes: ['KDSATKER', 'NMSATKER', 'KDSKPD'],
          include: [
            {
              model: SkpdTbl,
              attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
            }
          ]
        }
      ],
      order: [['BIDANGF', 'ASC']]
    });

    if (bidangList.length === 0) {
      const errorMessage = query 
        ? "Bidang tidak ditemukan" 
        : "Tidak ada Bidang tersedia";
        
      return res.status(404).json({ 
        error: errorMessage,
        searchQuery: query || null
      });
    }

    // Tambahkan informasi detail
    const bidangWithDetails = await Promise.all(
      bidangList.map(async (bidang) => {
        const bidangData = bidang.toJSON();
        
        try {
          // Hitung jumlah karyawan
          const employeeCount = await MstPegawai.count({
            where: { KDBIDANG: bidang.BIDANGF }
          });

          // Ambil admin
          const adminOpd = await AdmOpd.findAll({
            where: { id_bidang: bidang.BIDANGF },
            include: [{ model: User, attributes: ['id', 'username', 'email', 'level', 'status'] }]
          });

          const adminUpt = await AdmUpt.findAll({
            where: { id_bidang: bidang.BIDANGF },
            include: [{ model: User, attributes: ['id', 'username', 'email', 'level', 'status'] }]
          });

          const allAdmins = [
            ...adminOpd.map(admin => ({ ...admin.User.toJSON(), kategori: admin.kategori, type: 'admin_opd' })),
            ...adminUpt.map(admin => ({ ...admin.User.toJSON(), kategori: admin.kategori, umum: admin.umum, type: 'admin_upt' }))
          ];

          return {
            ...bidangData,
            employee_count: employeeCount,
            admin_count: allAdmins.length,
            admins: allAdmins
          };
        } catch (error) {
          console.error(`Error getting details for Bidang ${bidang.BIDANGF}:`, error);
          return {
            ...bidangData,
            employee_count: 0,
            admin_count: 0,
            admins: []
          };
        }
      })
    );

    res.json({
      data: bidangWithDetails,
      searchQuery: query || null
    });
  } catch (error) {
    console.error('SearchBidang Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get Bidang by ID
const getBidangById = async (req, res) => {
  try {
    const { bidangf } = req.params;
    
    const bidang = await BidangTbl.findByPk(bidangf, {
      include: [
        {
          model: SatkerTbl,
          attributes: ['KDSATKER', 'NMSATKER', 'KDSKPD'],
          include: [
            {
              model: SkpdTbl,
              attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
            }
          ]
        }
      ]
    });
    
    if (!bidang) {
      return res.status(404).json({ error: "Bidang tidak ditemukan" });
    }

    try {
      // Hitung jumlah karyawan
      const employeeCount = await MstPegawai.count({
        where: { KDBIDANG: bidangf }
      });

      // Ambil admin
      const adminOpd = await AdmOpd.findAll({
        where: { id_bidang: bidangf },
        include: [{ model: User, attributes: ['id', 'username', 'email', 'level', 'status'] }]
      });

      const adminUpt = await AdmUpt.findAll({
        where: { id_bidang: bidangf },
        include: [{ model: User, attributes: ['id', 'username', 'email', 'level', 'status'] }]
      });

      const allAdmins = [
        ...adminOpd.map(admin => ({ ...admin.User.toJSON(), kategori: admin.kategori, type: 'admin_opd' })),
        ...adminUpt.map(admin => ({ ...admin.User.toJSON(), kategori: admin.kategori, umum: admin.umum, type: 'admin_upt' }))
      ];

      const bidangData = bidang.toJSON();
      res.json({
        ...bidangData,
        employee_count: employeeCount,
        admin_count: allAdmins.length,
        admins: allAdmins
      });
    } catch (error) {
      console.error(`Error getting details for Bidang ${bidangf}:`, error);
      res.json({
        ...bidang.toJSON(),
        employee_count: 0,
        admin_count: 0,
        admins: []
      });
    }
  } catch (error) {
    console.error('GetBidangById Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get Bidang by Satker
const getBidangBySatker = async (req, res) => {
  try {
    const { kdsatker } = req.params;
    
    const bidangList = await BidangTbl.findAll({
      where: { KDSATKER: kdsatker },
      include: [
        {
          model: SatkerTbl,
          attributes: ['KDSATKER', 'NMSATKER', 'KDSKPD'],
          include: [
            {
              model: SkpdTbl,
              attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
            }
          ]
        }
      ],
      order: [['BIDANGF', 'ASC']]
    });

    if (bidangList.length === 0) {
      return res.status(404).json({ error: "Tidak ada Bidang ditemukan untuk Satker ini" });
    }

    // Tambahkan informasi detail
    const bidangWithDetails = await Promise.all(
      bidangList.map(async (bidang) => {
        const bidangData = bidang.toJSON();
        
        try {
          const employeeCount = await MstPegawai.count({
            where: { KDBIDANG: bidang.BIDANGF }
          });

          return {
            ...bidangData,
            employee_count: employeeCount
          };
        } catch (error) {
          console.error(`Error getting details for Bidang ${bidang.BIDANGF}:`, error);
          return {
            ...bidangData,
            employee_count: 0
          };
        }
      })
    );

    res.json({
      data: bidangWithDetails,
      kdsatker: kdsatker
    });
  } catch (error) {
    console.error('GetBidangBySatker Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  getAllBidang, 
  searchBidang, 
  getBidangById, 
  getBidangBySatker
};
