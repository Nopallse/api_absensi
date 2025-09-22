const { SkpdTbl, SatkerTbl, BidangTbl, MstPegawai, AdmOpd, AdmUpt, User } = require("../models");
const Sequelize = require("sequelize");

// LEVEL 2: Get Satker by SKPD with hierarchy context (supports search)
const getSatkerBySkpdHierarchy = async (req, res) => {
  try {
    const { kdskpd } = req.params;
    const { search } = req.query; // Support search parameter
    
    // Validate SKPD exists first
    const skpd = await SkpdTbl.findByPk(kdskpd);
    if (!skpd) {
      return res.status(404).json({ error: "SKPD tidak ditemukan" });
    }

    // Build where clause - if no search, get all satker in SKPD
    let whereClause = { KDSKPD: kdskpd };
    
    if (search) {
      whereClause = {
        KDSKPD: kdskpd,
        [Sequelize.Op.or]: [
          { KDSATKER: { [Sequelize.Op.like]: `%${search}%` } },
          { NMSATKER: { [Sequelize.Op.like]: `%${search}%` } },
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
      const errorMessage = search 
        ? "Satker tidak ditemukan dalam SKPD ini" 
        : "Tidak ada Satker ditemukan untuk SKPD ini";
      
      return res.status(404).json({ 
        error: errorMessage,
        hierarchy: {
          skpd: skpd.toJSON()
        },
        searchQuery: search || null
      });
    }

    // Add employee and bidang count for each satker
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
      hierarchy: {
        skpd: skpd.toJSON()
      },
      searchQuery: search || null,
      path: `/skpd/${kdskpd}/satker`
    });
  } catch (error) {
    console.error('GetSatkerBySkpdHierarchy Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// LEVEL 2: Get specific Satker within SKPD
const getSatkerByIdInSkpd = async (req, res) => {
  try {
    const { kdskpd, kdsatker } = req.params;
    
    // Validate SKPD exists first
    const skpd = await SkpdTbl.findByPk(kdskpd);
    if (!skpd) {
      return res.status(404).json({ error: "SKPD tidak ditemukan" });
    }

    const satker = await SatkerTbl.findOne({
      where: { 
        KDSATKER: kdsatker,
        KDSKPD: kdskpd 
      },
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
      return res.status(404).json({ 
        error: "Satker tidak ditemukan dalam SKPD ini",
        hierarchy: {
          skpd: skpd.toJSON()
        }
      });
    }

    try {
      // Get employee count
      const employeeCount = await MstPegawai.count({
        where: { KDSATKER: kdsatker }
      });

      // Get admins
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
        bidang_list: satkerData.BidangTbls || [],
        hierarchy: {
          skpd: skpd.toJSON()
        },
        path: `/skpd/${kdskpd}/satker/${kdsatker}`
      });
    } catch (error) {
      console.error(`Error getting details for Satker ${kdsatker}:`, error);
      res.json({
        ...satker.toJSON(),
        employee_count: 0,
        admin_count: 0,
        admins: [],
        bidang_count: 0,
        bidang_list: [],
        hierarchy: {
          skpd: skpd.toJSON()
        },
        path: `/skpd/${kdskpd}/satker/${kdsatker}`
      });
    }
  } catch (error) {
    console.error('GetSatkerByIdInSkpd Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// LEVEL 3: Get Bidang by Satker within SKPD (supports search)
const getBidangBySatkerInSkpd = async (req, res) => {
  try {
    const { kdskpd, kdsatker } = req.params;
    const { search } = req.query; // Support search parameter
    
    // Validate hierarchy
    const skpd = await SkpdTbl.findByPk(kdskpd);
    if (!skpd) {
      return res.status(404).json({ error: "SKPD tidak ditemukan" });
    }

    const satker = await SatkerTbl.findOne({
      where: { 
        KDSATKER: kdsatker,
        KDSKPD: kdskpd 
      }
    });
    
    if (!satker) {
      return res.status(404).json({ 
        error: "Satker tidak ditemukan dalam SKPD ini",
        hierarchy: {
          skpd: skpd.toJSON()
        }
      });
    }

    // Build where clause - if no search, get all bidang in satker
    let whereClause = { KDSATKER: kdsatker };
    
    if (search) {
      whereClause = {
        KDSATKER: kdsatker,
        [Sequelize.Op.or]: [
          { BIDANGF: { [Sequelize.Op.like]: `%${search}%` } },
          { NMBIDANG: { [Sequelize.Op.like]: `%${search}%` } },
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
      const errorMessage = search 
        ? "Bidang tidak ditemukan dalam Satker ini" 
        : "Tidak ada Bidang ditemukan untuk Satker ini";
      
      return res.status(404).json({ 
        error: errorMessage,
        hierarchy: {
          skpd: skpd.toJSON(),
          satker: satker.toJSON()
        },
        searchQuery: search || null
      });
    }

    // Add employee count for each bidang
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
          return {
            ...bidangData,
            employee_count: 0
          };
        }
      })
    );

    res.json({
      data: bidangWithDetails,
      hierarchy: {
        skpd: skpd.toJSON(),
        satker: satker.toJSON()
      },
      searchQuery: search || null,
      path: `/skpd/${kdskpd}/satker/${kdsatker}/bidang`
    });
  } catch (error) {
    console.error('GetBidangBySatkerInSkpd Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// LEVEL 3: Get specific Bidang within Satker and SKPD
const getBidangByIdInSatker = async (req, res) => {
  try {
    const { kdskpd, kdsatker, bidangf } = req.params;
    
    // Validate hierarchy
    const skpd = await SkpdTbl.findByPk(kdskpd);
    if (!skpd) {
      return res.status(404).json({ error: "SKPD tidak ditemukan" });
    }

    const satker = await SatkerTbl.findOne({
      where: { 
        KDSATKER: kdsatker,
        KDSKPD: kdskpd 
      }
    });
    
    if (!satker) {
      return res.status(404).json({ 
        error: "Satker tidak ditemukan dalam SKPD ini",
        hierarchy: {
          skpd: skpd.toJSON()
        }
      });
    }

    const bidang = await BidangTbl.findOne({
      where: { 
        BIDANGF: bidangf,
        KDSATKER: kdsatker 
      },
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
      return res.status(404).json({ 
        error: "Bidang tidak ditemukan dalam Satker ini",
        hierarchy: {
          skpd: skpd.toJSON(),
          satker: satker.toJSON()
        }
      });
    }

    try {
      // Get employee count
      const employeeCount = await MstPegawai.count({
        where: { KDBIDANG: bidangf }
      });

      // Get admins
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
        admins: allAdmins,
        hierarchy: {
          skpd: skpd.toJSON(),
          satker: satker.toJSON()
        },
        path: `/skpd/${kdskpd}/satker/${kdsatker}/bidang/${bidangf}`
      });
    } catch (error) {
      console.error(`Error getting details for Bidang ${bidangf}:`, error);
      res.json({
        ...bidang.toJSON(),
        employee_count: 0,
        admin_count: 0,
        admins: [],
        hierarchy: {
          skpd: skpd.toJSON(),
          satker: satker.toJSON()
        },
        path: `/skpd/${kdskpd}/satker/${kdsatker}/bidang/${bidangf}`
      });
    }
  } catch (error) {
    console.error('GetBidangByIdInSatker Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSatkerBySkpdHierarchy,
  getSatkerByIdInSkpd,
  getBidangBySatkerInSkpd,
  getBidangByIdInSatker
};
