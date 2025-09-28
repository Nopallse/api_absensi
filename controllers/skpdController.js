const { SkpdTbl, AdmOpd, User, MstPegawai, SkpdLokasi, Lokasi, SatkerTbl, BidangTbl } = require("../models");
const Sequelize = require("sequelize");

// Get all SKPD with employee count and admin info (supports search)
const getAllSkpd = async (req, res) => {
  try {
    // Ambil parameter pagination dan search dari query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { query } = req.query; // Support search only

    // Build where clause - selalu filter status aktif
    let whereClause = {
      StatusSKPD: 'Aktif' // Selalu hanya tampilkan SKPD dengan status aktif
    };
    
    if (query) {
      whereClause = {
        ...whereClause,
        [Sequelize.Op.or]: [
          { KDSKPD: { [Sequelize.Op.like]: `%${query}%` } },
          { NMSKPD: { [Sequelize.Op.like]: `%${query}%` } },
        ],
      };
    }

    // Hitung total data untuk informasi pagination
    const totalSkpd = await SkpdTbl.count({ where: whereClause });
    const totalPages = Math.ceil(totalSkpd / limit);

    // Ambil data SKPD dengan pagination dan search
    const skpdList = await SkpdTbl.findAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['KDSKPD', 'ASC']]
    });

    if (skpdList.length === 0) {
      const errorMessage = query 
        ? "SKPD tidak ditemukan" 
        : "Tidak ada SKPD tersedia";
        
      return res.status(404).json({ 
        error: errorMessage,
        searchQuery: query || null,
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
          itemsPerPage: limit
        }
      });
    }

    // Tambahkan informasi jumlah karyawan dan admin untuk setiap SKPD
    const skpdWithDetails = await Promise.all(
      skpdList.map(async (skpd) => {
        const skpdData = skpd.toJSON();
        
        try {
          // Hitung jumlah karyawan dari database master
          const employeeCount = await MstPegawai.count({
            where: { KDSKPD: skpd.KDSKPD }
          });

          // Hitung jumlah Satker
          const satkerCount = await SatkerTbl.count({
            where: { KDSKPD: skpd.KDSKPD }
          });

          // Hitung jumlah Bidang
          const bidangCount = await BidangTbl.count({
            where: { 
              KDSATKER: {
                [Sequelize.Op.in]: await SatkerTbl.findAll({
                  where: { KDSKPD: skpd.KDSKPD },
                  attributes: ['KDSATKER']
                }).then(satkers => satkers.map(s => s.KDSATKER))
              }
            }
          });

          // Hitung jumlah Lokasi
          const lokasiCount = await Lokasi.count({
            where: { 
              id_skpd: skpd.KDSKPD,
              status: true
            }
          });

          // Ambil detail lokasi
          const lokasiList = await Lokasi.findAll({
            where: { 
              id_skpd: skpd.KDSKPD,
              status: true
            },
            attributes: ['lokasi_id', 'lat', 'lng', 'ket', 'id_satker', 'id_bidang']
          });



          return {
            ...skpdData,
            employee_count: employeeCount,
            satker_count: satkerCount,
            bidang_count: bidangCount,
            lokasi_count: lokasiCount,
            lokasi_list: lokasiList,
          };
        } catch (error) {
          console.error(`Error getting details for SKPD ${skpd.KDSKPD}:`, error);
          return {
            ...skpdData,
            employee_count: 0,
            satker_count: 0,
            bidang_count: 0,
            lokasi_count: 0,
            lokasi_list: [],
          };
        }
      })
    );

    // Kirim response dengan informasi pagination dan search
    res.json({
      data: skpdWithDetails,
      pagination: {
        totalItems: totalSkpd,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      searchQuery: query || null
    });
  } catch (error) {
    console.error('GetAllSkpd Error:', error);
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

      // Hitung jumlah Satker
      const satkerCount = await SatkerTbl.count({
        where: { KDSKPD: kdskpd }
      });

      // Hitung jumlah Bidang
      const bidangCount = await BidangTbl.count({
        where: { 
          KDSATKER: {
            [Sequelize.Op.in]: await SatkerTbl.findAll({
              where: { KDSKPD: kdskpd },
              attributes: ['KDSATKER']
            }).then(satkers => satkers.map(s => s.KDSATKER))
          }
        }
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
          attributes: ['lokasi_id', 'lat', 'lng', 'range', 'ket', 'status', 'id_satker', 'id_bidang']
        }]
      });

      const lokasiList = skpdLokasi.map(sl => sl.Lokasi);

      const skpdData = skpd.toJSON();
      res.json({
        ...skpdData,
        employee_count: employeeCount,
        satker_count: satkerCount,
        bidang_count: bidangCount,
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
        satker_count: 0,
        bidang_count: 0,
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



// Get available SKPD codes for filtering (hanya yang aktif)
const getAvailableSkpdCodes = async (req, res) => {
  try {
    // Selalu filter hanya SKPD dengan status aktif
    const whereClause = {
      StatusSKPD: 'Aktif'
    };

    const skpdCodes = await SkpdTbl.findAll({
      attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD'],
      where: whereClause,
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
  getSkpdById, 
  getAvailableSkpdCodes
};