const { BidangTbl, SatkerTbl, SkpdTbl, MstPegawai, AdmOpd, AdmUpt, User } = require("../models");
const Sequelize = require("sequelize");

// Get all Bidang with employee count and admin info
const getAllBidang = async (req, res) => {
  try {
    // Ambil parameter pagination, search, dan filter dari query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { kdsatker, kdskpd, search } = req.query;

    // Build where clause
    let whereClause = {};
    
    // Filter berdasarkan SATKER jika ada
    if (kdsatker) {
      whereClause.KDSATKER = kdsatker;
    }

    // Filter berdasarkan SKPD jika ada (akan diterapkan pada parent SKPD)
    
    // Jika ada filter SKPD dan Satker, pastikan Satker tersebut benar-benar milik SKPD tersebut
    if (kdskpd && kdsatker) {
      // Validasi bahwa Satker benar-benar milik SKPD yang diminta
      const satkerValidation = await SatkerTbl.findOne({
        where: {
          KDSATKER: kdsatker,
          KDSKPD: kdskpd
        }
      });
      
      if (!satkerValidation) {
        // Jika Satker tidak ditemukan di SKPD tersebut, return empty
        return res.json({
          data: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage: page,
            itemsPerPage: limit
          },
          filter: {
            kdsatker: kdsatker,
            kdskpd: kdskpd
          },
          searchQuery: search || null,
          message: `Satker ${kdsatker} tidak ditemukan di SKPD ${kdskpd}`
        });
      }
    }

    // Search functionality
    if (search) {
      whereClause[Sequelize.Op.or] = [
        { BIDANGF: { [Sequelize.Op.like]: `%${search}%` } },
        { NMBIDANG: { [Sequelize.Op.like]: `%${search}%` } },
      ];
    }

    // Hitung total data untuk informasi pagination (filter berdasarkan STATUS_BIDANG)
    const totalBidang = await BidangTbl.count({ 
      where: {
        ...whereClause,
        STATUS_BIDANG: '1' // Selalu hanya Bidang aktif
      },
      include: [
        {
          model: SatkerTbl,
          include: [
            {
              model: SkpdTbl,
              where: {
                ...(kdskpd && { KDSKPD: kdskpd }),
                StatusSKPD: 'Aktif' 
              },
              required: true
            }
          ],
          required: true
        }
      ]
    });
    const totalPages = Math.ceil(totalBidang / limit);

    // Ambil data Bidang dengan pagination
    const bidangList = await BidangTbl.findAll({
      where: {
        ...whereClause,
        STATUS_BIDANG: '1' // Selalu hanya Bidang aktif
      },
      include: [
        {
          model: SatkerTbl,
          attributes: ['KDSATKER', 'NMSATKER', 'KDSKPD'],
          include: [
            {
              model: SkpdTbl,
              attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD'],
              where: {
                ...(kdskpd && { KDSKPD: kdskpd }),
                StatusSKPD: 'Aktif' 
              },
              required: true
            }
          ],
          required: true
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
          // Hitung jumlah karyawan dari database master berdasarkan BIDANGF
          const employeeCount = await MstPegawai.count({
            where: { BIDANGF: bidang.BIDANGF }
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

    // Build filter response
    let filterResponse = {};
    if (kdsatker) filterResponse.kdsatker = kdsatker;
    if (kdskpd) filterResponse.kdskpd = kdskpd;

    // Kirim response dengan informasi pagination
    res.json({
      data: bidangWithDetails,
      pagination: {
        totalItems: totalBidang,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      filter: Object.keys(filterResponse).length > 0 ? filterResponse : null,
      searchQuery: search || null
    });
  } catch (error) {
    console.error('GetAllBidang Error:', error);
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
        where: { BIDANGF: bidangf }
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
            where: { BIDANGF: bidang.BIDANGF }
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
  getBidangById, 
  getBidangBySatker
};
