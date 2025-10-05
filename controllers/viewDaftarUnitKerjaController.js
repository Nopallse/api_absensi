const { ViewDaftarUnitKerja, SatkerTbl, BidangTbl, BidangSub } = require("../models");
const Sequelize = require("sequelize");
const { Op } = Sequelize;

/**
 * Mendapatkan semua data view_daftar_unit_kerja dengan search, filter, dan pagination
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAllViewDaftarUnitKerja = async (req, res) => {
  try {
    // Ambil parameter pagination, search, dan filter dari query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, jenis } = req.query;

    // Build kondisi where
    let whereCondition = {
      status: '1' // Selalu filter status = 1
    };

    // Tambahkan search jika ada
    if (search) {
      whereCondition[Op.or] = [
        { id_unit_kerja: { [Op.like]: `%${search}%` } },
        { kd_unit_kerja: { [Op.like]: `%${search}%` } },
        { nm_unit_kerja: { [Op.like]: `%${search}%` } }
      ];
    }

    // Sementara nonaktifkan filter jenis karena masalah collation
    // if (jenis) {
    //   whereCondition.jenis = jenis;
    // }

    // Hitung total data
    const totalItems = await ViewDaftarUnitKerja.count({
      where: whereCondition
    });

    // Ambil data dengan pagination
    const data = await ViewDaftarUnitKerja.findAll({
      where: whereCondition,
      limit: limit,
      offset: offset,
      order: [['nm_unit_kerja', 'ASC']],
      include: getIncludeByJenis(jenis)
    });

    // Enrich data dengan relasi berdasarkan jenis
    const enrichedData = await enrichDataWithRelations(data);

    const totalPages = Math.ceil(totalItems / limit);

    // Build filter response
    let filterResponse = {};
    if (jenis) filterResponse.jenis = jenis;

    res.json({
      data: enrichedData,
      pagination: {
        totalItems: totalItems,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      filter: Object.keys(filterResponse).length > 0 ? filterResponse : null,
      searchQuery: search || null
    });

  } catch (error) {
    console.error('GetAllViewDaftarUnitKerja Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan data view_daftar_unit_kerja berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getViewDaftarUnitKerjaById = async (req, res) => {
  try {
    const { kd_unit_kerja } = req.params;

    const data = await ViewDaftarUnitKerja.findOne({
      where: {
        kd_unit_kerja: kd_unit_kerja,
        status: '1'
      },
      include: getIncludeByJenis()
    });

    if (!data) {
      return res.status(404).json({ error: "Data unit kerja tidak ditemukan" });
    }

    // Enrich data dengan relasi
    const enrichedData = await enrichDataWithRelations([data]);

    res.json(enrichedData[0]);

  } catch (error) {
    console.error('GetViewDaftarUnitKerjaById Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan include berdasarkan jenis
 * @param {String} jenis - Jenis relasi yang diinginkan
 * @returns {Array} Array include untuk Sequelize
 */
const getIncludeByJenis = (jenis = null) => {
  const includes = [];

  // Jika tidak ada jenis yang dipilih, include semua kemungkinan relasi
  if (!jenis) {
    includes.push(
      {
        model: SatkerTbl,
        as: 'satker',
        required: false,
        where: { STATUS_SATKER: '1' },
        attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN']
      },
      {
        model: BidangTbl,
        as: 'bidang',
        required: false,
        where: { STATUS_BIDANG: '1' },
        attributes: ['BIDANGF', 'NMBIDANG', 'NAMA_JABATAN', 'JENIS_JABATAN']
      },
      {
        model: BidangSub,
        as: 'bidangSub',
        required: false,
        where: { STATUS_SUB: '1' },
        attributes: ['SUBF', 'NMSUB', 'NAMA_JABATAN', 'BIDANGF']
      }
    );
  } else {
    // Include berdasarkan jenis yang dipilih
    switch (jenis) {
      case 'satker_tbl':
        includes.push({
          model: SatkerTbl,
          as: 'satker',
          required: true,
          where: { STATUS_SATKER: '1' },
          attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN']
        });
        break;
      case 'bidang_tbl':
        includes.push({
          model: BidangTbl,
          as: 'bidang',
          required: true,
          where: { STATUS_BIDANG: '1' },
          attributes: ['BIDANGF', 'NMBIDANG', 'NAMA_JABATAN', 'JENIS_JABATAN']
        });
        // Tambahkan include satker untuk mendapatkan data satker induk
        includes.push({
          model: SatkerTbl,
          as: 'satkerInduk',
          required: false,
          where: { STATUS_SATKER: '1' },
          attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN']
        });
        break;
      case 'bidang_sub':
        includes.push({
          model: BidangSub,
          as: 'bidangSub',
          required: true,
          where: { STATUS_SUB: '1' },
          attributes: ['SUBF', 'NMSUB', 'NAMA_JABATAN', 'BIDANGF']
        });
        // Tambahkan include satker untuk mendapatkan data satker induk
        includes.push({
          model: SatkerTbl,
          as: 'satkerInduk',
          required: false,
          where: { STATUS_SATKER: '1' },
          attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN']
        });
        // Tambahkan include bidang untuk mendapatkan data bidang induk
        includes.push({
          model: BidangTbl,
          as: 'bidang',
          required: false,
          where: { STATUS_BIDANG: '1' },
          attributes: ['BIDANGF', 'NMBIDANG', 'NAMA_JABATAN', 'JENIS_JABATAN']
        });
        break;
    }
  }

  return includes;
};

/**
 * Enrich data dengan relasi berdasarkan jenis
 * @param {Array} data - Array data dari ViewDaftarUnitKerja
 * @returns {Array} Array data yang sudah di-enrich
 */
const enrichDataWithRelations = async (data) => {
  const enrichedData = [];

  for (const item of data) {
    const itemData = item.toJSON();
    
    // Tambahkan data relasi berdasarkan jenis
    switch (itemData.jenis) {
      case 'satker_tbl':
        if (itemData.satker) {
          itemData.relasi_data = {
            kd_satker: itemData.satker.KDSATKER,
            nm_satker: itemData.satker.NMSATKER,
            nama_jabatan: itemData.satker.NAMA_JABATAN,
            jenis_jabatan: itemData.satker.JENIS_JABATAN
          };
        }
        break;
      case 'bidang_tbl':
        if (itemData.bidang) {
          itemData.relasi_data = {
            bidangf: itemData.bidang.BIDANGF,
            nm_bidang: itemData.bidang.NMBIDANG,
            nama_jabatan: itemData.bidang.NAMA_JABATAN,
            jenis_jabatan: itemData.bidang.JENIS_JABATAN
          };
          
          // Tambahkan data satker jika ada
          if (itemData.satkerInduk) {
            itemData.relasi_data.kd_satker = itemData.satkerInduk.KDSATKER;
            itemData.relasi_data.nm_satker = itemData.satkerInduk.NMSATKER;
          }
        }
        break;
      case 'bidang_sub':
        if (itemData.bidangSub) {
          itemData.relasi_data = {
            subf: itemData.bidangSub.SUBF,
            nm_sub: itemData.bidangSub.NMSUB,
            nama_jabatan: itemData.bidangSub.NAMA_JABATAN,
            bidangf: itemData.bidangSub.BIDANGF
          };
          
          // Tambahkan data satker jika ada
          if (itemData.satkerInduk) {
            itemData.relasi_data.kd_satker = itemData.satkerInduk.KDSATKER;
            itemData.relasi_data.nm_satker = itemData.satkerInduk.NMSATKER;
          }
          
          // Tambahkan data bidang induk jika ada
          if (itemData.bidang) {
            itemData.relasi_data.nm_bidang = itemData.bidang.NMBIDANG;
          }
        }
        break;
    }

    // Hapus data relasi yang tidak perlu dari response
    delete itemData.satker;
    delete itemData.bidang;
    delete itemData.bidangSub;
    delete itemData.satkerInduk;

    enrichedData.push(itemData);
  }

  return enrichedData;
};

/**
 * Mendapatkan data Level 1 (Satuan Kerja) dengan pagination dan search - Versi Tanpa View
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getLevel1DataNoView = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    // Build kondisi where untuk level 1
    let whereClause = "WHERE STATUS_SATKER = '1'";
    
    // Tambahkan search jika ada
    if (search) {
      whereClause += ` AND (KDSATKER LIKE '%${search}%' OR NMSATKER LIKE '%${search}%')`;
    }

    // Hitung total data menggunakan raw query langsung dari tabel satker_tbl
    const countResult = await ViewDaftarUnitKerja.sequelize.query(
      `SELECT COUNT(*) as count FROM satker_tbl ${whereClause}`,
      { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
    );
    const totalItems = countResult[0].count;

    // Ambil data dengan pagination menggunakan raw query langsung dari tabel satker_tbl
    const data = await ViewDaftarUnitKerja.sequelize.query(
      `SELECT KDSATKER, NMSATKER, NAMA_JABATAN, JENIS_JABATAN FROM satker_tbl ${whereClause} ORDER BY NMSATKER ASC LIMIT ${limit} OFFSET ${offset}`,
      { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
    );

    // Transform data ke format yang diharapkan frontend
    const enrichedData = data.map(item => ({
      id_unit_kerja: item.KDSATKER,
      kd_unit_kerja: item.KDSATKER,
      nm_unit_kerja: item.NMSATKER,
      jenis: 'satker_tbl',
      status: '1',
      kd_unit_atasan: null,
      relasi_data: {
        kd_satker: item.KDSATKER,
        nm_satker: item.NMSATKER,
        nama_jabatan: item.NAMA_JABATAN,
        jenis_jabatan: item.JENIS_JABATAN
      }
    }));

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: enrichedData,
      pagination: {
        totalItems: totalItems,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      searchQuery: search || null
    });

  } catch (error) {
    console.error('GetLevel1DataNoView Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan data Level 2 (Bidang) dengan pagination dan search - Versi Tanpa View
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getLevel2DataNoView = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, satker } = req.query;

    // Build kondisi where untuk level 2 dari view_daftar_unit_kerja
    let whereCondition = {
      status: '1'
      // Sementara nonaktifkan filter jenis karena masalah collation
      // jenis: 'bidang_tbl',
      // kd_unit_atasan: { [Op.ne]: null }
    };
    
    // Tambahkan filter satker jika ada
    if (satker) {
      whereCondition.kd_unit_atasan = satker;
    }
    
    // Tambahkan search jika ada
    if (search) {
      whereCondition[Op.or] = [
        { id_unit_kerja: { [Op.like]: `%${search}%` } },
        { kd_unit_kerja: { [Op.like]: `%${search}%` } },
        { nm_unit_kerja: { [Op.like]: `%${search}%` } }
      ];
    }

    // Hitung total data
    const totalItems = await ViewDaftarUnitKerja.count({
      where: whereCondition
    });

    // Ambil semua data untuk filter di backend
    const allData = await ViewDaftarUnitKerja.findAll({
      where: whereCondition,
      order: [['nm_unit_kerja', 'ASC']]
    });

    // Filter data untuk jenis bidang_tbl dan kd_unit_atasan tidak null
    const filteredData = allData.filter(item => 
      item.jenis === 'bidang_tbl' && item.kd_unit_atasan !== null
    );

    // Apply pagination setelah filter
    const data = filteredData.slice(offset, offset + limit);

    // Transform data ke format yang diharapkan frontend
    const enrichedData = [];
    for (const item of data) {
      // Ambil data satker induk menggunakan raw query
      const satkerData = await ViewDaftarUnitKerja.sequelize.query(
        `SELECT KDSATKER, NMSATKER FROM satker_tbl WHERE KDSATKER = '${item.kd_unit_atasan}' AND STATUS_SATKER = '1'`,
        { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
      );
      
      let satkerInfo = null;
      if (satkerData && satkerData.length > 0) {
        satkerInfo = satkerData[0];
      }

      // Hitung jumlah sub bidang
      const subBidangCount = allData.filter(subItem => 
        subItem.jenis === 'bidang_sub' && subItem.kd_unit_atasan === item.kd_unit_kerja
      ).length;

      enrichedData.push({
        id_unit_kerja: item.id_unit_kerja,
        kd_unit_kerja: item.kd_unit_kerja,
        nm_unit_kerja: item.nm_unit_kerja,
        jenis: item.jenis,
        status: item.status,
        kd_unit_atasan: item.kd_unit_atasan,
        relasi_data: {
          bidangf: item.kd_unit_kerja,
          nm_bidang: item.nm_unit_kerja,
          kd_satker: satkerInfo ? satkerInfo.KDSATKER : item.kd_unit_atasan,
          nm_satker: satkerInfo ? satkerInfo.NMSATKER : null,
          sub_bidang_count: subBidangCount
        }
      });
    }

    const totalPages = Math.ceil(filteredData.length / limit);

    res.json({
      data: enrichedData,
      pagination: {
        totalItems: filteredData.length,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      searchQuery: search || null,
      filter: satker ? { satker } : null
    });

  } catch (error) {
    console.error('GetLevel2DataNoView Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan data Level 3 (Sub Bidang) dengan pagination dan search - Versi Tanpa View
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getLevel3DataNoView = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, satker, bidang } = req.query;

    // Build kondisi where untuk level 3 dari view_daftar_unit_kerja
    let whereCondition = {
      status: '1'
      // Sementara nonaktifkan filter jenis karena masalah collation
      // jenis: 'bidang_sub',
      // kd_unit_atasan: { [Op.ne]: null }
    };
    
    // Tambahkan filter bidang jika ada
    if (bidang) {
      whereCondition.kd_unit_atasan = bidang;
    }
    
    // Tambahkan filter satker jika ada (untuk level 3, satker adalah kd_unit_atasan dari bidang induk)
    if (satker && !bidang) {
      // Jika hanya ada satker tanpa bidang, kita perlu filter berdasarkan bidang yang memiliki kd_unit_atasan = satker
      // Kita akan filter ini di backend setelah mengambil data
    }
    
    // Tambahkan search jika ada
    if (search) {
      whereCondition[Op.or] = [
        { id_unit_kerja: { [Op.like]: `%${search}%` } },
        { kd_unit_kerja: { [Op.like]: `%${search}%` } },
        { nm_unit_kerja: { [Op.like]: `%${search}%` } }
      ];
    }

    // Hitung total data
    const totalItems = await ViewDaftarUnitKerja.count({
      where: whereCondition
    });

    // Ambil semua data untuk filter di backend (hindari masalah collation)
    const allData = await ViewDaftarUnitKerja.findAll({
      where: {
        status: '1'
      },
      order: [['nm_unit_kerja', 'ASC']]
    });

    // Filter data untuk jenis bidang_sub dan kd_unit_atasan tidak null
    let filteredData = allData.filter(item => 
      item.jenis === 'bidang_sub' && item.kd_unit_atasan !== null
    );

    // Jika ada filter satker tanpa bidang, filter berdasarkan bidang yang memiliki kd_unit_atasan = satker
    if (satker && !bidang) {
      // Ambil semua bidang yang memiliki kd_unit_atasan = satker dari data yang sudah diambil
      const bidangList = allData.filter(item => 
        item.jenis === 'bidang_tbl' && item.kd_unit_atasan === satker
      );
      
      const bidangKodes = bidangList.map(b => b.kd_unit_kerja);
      
      // Filter sub bidang berdasarkan bidang yang memiliki satker yang dipilih
      filteredData = filteredData.filter(item => 
        bidangKodes.includes(item.kd_unit_atasan)
      );
    }

    // Jika ada filter bidang, filter berdasarkan bidang yang dipilih
    if (bidang) {
      filteredData = filteredData.filter(item => 
        item.kd_unit_atasan === bidang
      );
    }

    // Jika ada search, filter berdasarkan search
    if (search) {
      filteredData = filteredData.filter(item => 
        item.id_unit_kerja.includes(search) ||
        item.kd_unit_kerja.includes(search) ||
        item.nm_unit_kerja.includes(search)
      );
    }

    // Apply pagination setelah filter
    const data = filteredData.slice(offset, offset + limit);

    // Transform data ke format yang diharapkan frontend
    const enrichedData = [];
    for (const item of data) {
      // Ambil data bidang induk menggunakan raw query
      const bidangData = await ViewDaftarUnitKerja.sequelize.query(
        `SELECT BIDANGF, NMBIDANG, NAMA_JABATAN, JENIS_JABATAN, KDSATKER FROM bidang_tbl WHERE BIDANGF = '${item.kd_unit_atasan}' AND STATUS_BIDANG = '1'`,
        { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
      );
      
      let bidangInfo = null;
      let satkerInfo = null;
      
      if (bidangData && bidangData.length > 0) {
        bidangInfo = bidangData[0];
        
        // Ambil data satker induk menggunakan raw query
        const satkerData = await ViewDaftarUnitKerja.sequelize.query(
          `SELECT KDSATKER, NMSATKER, NAMA_JABATAN, JENIS_JABATAN FROM satker_tbl WHERE KDSATKER = '${bidangInfo.KDSATKER}' AND STATUS_SATKER = '1'`,
          { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
        );
        
        if (satkerData && satkerData.length > 0) {
          satkerInfo = satkerData[0];
        }
      }
      
      enrichedData.push({
        id_unit_kerja: item.id_unit_kerja, // Menggunakan id_unit_kerja dari view
        kd_unit_kerja: item.kd_unit_kerja,
        nm_unit_kerja: item.nm_unit_kerja,
        jenis: item.jenis,
        status: item.status,
        kd_unit_atasan: item.kd_unit_atasan,
        relasi_data: {
          subf: item.kd_unit_kerja,
          nm_sub: item.nm_unit_kerja,
          nama_jabatan: item.nm_unit_kerja, // Default, bisa diambil dari relasi jika diperlukan
          bidangf: item.kd_unit_atasan,
          nm_bidang: bidangInfo ? bidangInfo.NMBIDANG : null,
          kd_satker: satkerInfo ? satkerInfo.KDSATKER : null,
          nm_satker: satkerInfo ? satkerInfo.NMSATKER : null
        }
      });
    }

    const totalPages = Math.ceil(filteredData.length / limit);

    res.json({
      data: enrichedData,
      pagination: {
        totalItems: filteredData.length,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      },
      searchQuery: search || null,
      filter: satker || bidang ? { satker, bidang } : null
    });

  } catch (error) {
    console.error('GetLevel3DataNoView Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan data Level 2 (Bidang) dengan pagination dan search
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getLevel2Data = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, satker } = req.query;

    // Build kondisi where untuk level 2
    let whereCondition = {
      status: '1',
      jenis: 'bidang_tbl'
    };

    // Tambahkan search jika ada
    if (search) {
      whereCondition[Op.or] = [
        { id_unit_kerja: { [Op.like]: `%${search}%` } },
        { kd_unit_kerja: { [Op.like]: `%${search}%` } },
        { nm_unit_kerja: { [Op.like]: `%${search}%` } }
      ];
    }

    // Hitung total data menggunakan raw query untuk menghindari masalah collation
    const countResult = await ViewDaftarUnitKerja.sequelize.query(
      `SELECT COUNT(*) as count FROM view_daftar_unit_kerja WHERE status = '1' AND jenis = 'satker_tbl'`,
      { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
    );
    const totalItems = countResult[0].count;

    // Ambil data dengan pagination menggunakan raw query untuk menghindari masalah collation
    const data = await ViewDaftarUnitKerja.findAll({
      where: whereCondition,
      limit: limit,
      offset: offset,
      order: [['nm_unit_kerja', 'ASC']]
    });

    // Enrich data dengan relasi menggunakan raw query
    const enrichedData = [];
    for (const item of data) {
      const itemData = item.toJSON();
      
      // Ambil data bidang menggunakan raw query
      const bidangData = await BidangTbl.findOne({
        where: { 
          BIDANGF: itemData.kd_unit_kerja,
          STATUS_BIDANG: '1'
        },
        attributes: ['BIDANGF', 'NMBIDANG', 'NAMA_JABATAN', 'JENIS_JABATAN']
      });
      
      if (bidangData) {
        itemData.relasi_data = {
          bidangf: bidangData.BIDANGF,
          nm_bidang: bidangData.NMBIDANG,
          nama_jabatan: bidangData.NAMA_JABATAN,
          jenis_jabatan: bidangData.JENIS_JABATAN
        };
        
        // Ambil data satker induk menggunakan raw query
        const satkerData = await SatkerTbl.findOne({
          where: { 
            KDSATKER: itemData.kd_unit_atasan,
            STATUS_SATKER: '1'
          },
          attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN']
        });
        
        if (satkerData) {
          itemData.relasi_data.kd_satker = satkerData.KDSATKER;
          itemData.relasi_data.nm_satker = satkerData.NMSATKER;
        }
      }
      
      enrichedData.push(itemData);
    }

    // Filter berdasarkan satker jika ada
    let filteredData = enrichedData;
    if (satker) {
      filteredData = enrichedData.filter(item => 
        item.relasi_data && item.relasi_data.kd_satker === satker
      );
    }

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: filteredData,
      pagination: {
        totalItems: filteredData.length,
        totalPages: Math.ceil(filteredData.length / limit),
        currentPage: page,
        itemsPerPage: limit
      },
      searchQuery: search || null,
      filter: satker ? { satker } : null
    });

  } catch (error) {
    console.error('GetLevel2Data Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan data Level 3 (Sub Bidang) dengan pagination dan search
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getLevel3Data = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, satker, bidang } = req.query;

    // Build kondisi where untuk level 3
    let whereCondition = {
      status: '1',
      jenis: 'bidang_sub'
    };

    // Tambahkan search jika ada
    if (search) {
      whereCondition[Op.or] = [
        { id_unit_kerja: { [Op.like]: `%${search}%` } },
        { kd_unit_kerja: { [Op.like]: `%${search}%` } },
        { nm_unit_kerja: { [Op.like]: `%${search}%` } }
      ];
    }

    // Hitung total data menggunakan raw query untuk menghindari masalah collation
    const countResult = await ViewDaftarUnitKerja.sequelize.query(
      `SELECT COUNT(*) as count FROM view_daftar_unit_kerja WHERE status = '1' AND jenis = 'satker_tbl'`,
      { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
    );
    const totalItems = countResult[0].count;

    // Ambil data dengan pagination menggunakan raw query untuk menghindari masalah collation
    const data = await ViewDaftarUnitKerja.findAll({
      where: whereCondition,
      limit: limit,
      offset: offset,
      order: [['nm_unit_kerja', 'ASC']]
    });

    // Enrich data dengan relasi menggunakan raw query
    const enrichedData = [];
    for (const item of data) {
      const itemData = item.toJSON();
      
      // Ambil data bidang sub menggunakan raw query
      const bidangSubData = await BidangSub.findOne({
        where: { 
          SUBF: itemData.kd_unit_kerja,
          STATUS_SUB: '1'
        },
        attributes: ['SUBF', 'NMSUB', 'NAMA_JABATAN', 'BIDANGF']
      });
      
      if (bidangSubData) {
        itemData.relasi_data = {
          subf: bidangSubData.SUBF,
          nm_sub: bidangSubData.NMSUB,
          nama_jabatan: bidangSubData.NAMA_JABATAN,
          bidangf: bidangSubData.BIDANGF
        };
        
        // Ambil data satker induk menggunakan raw query
        const satkerData = await SatkerTbl.findOne({
          where: { 
            KDSATKER: itemData.kd_unit_atasan,
            STATUS_SATKER: '1'
          },
          attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN']
        });
        
        if (satkerData) {
          itemData.relasi_data.kd_satker = satkerData.KDSATKER;
          itemData.relasi_data.nm_satker = satkerData.NMSATKER;
        }
        
        // Ambil data bidang induk menggunakan raw query
        const bidangData = await BidangTbl.findOne({
          where: { 
            BIDANGF: bidangSubData.BIDANGF,
            STATUS_BIDANG: '1'
          },
          attributes: ['BIDANGF', 'NMBIDANG', 'NAMA_JABATAN', 'JENIS_JABATAN']
        });
        
        if (bidangData) {
          itemData.relasi_data.nm_bidang = bidangData.NMBIDANG;
        }
      }
      
      enrichedData.push(itemData);
    }

    // Filter berdasarkan satker dan bidang jika ada
    let filteredData = enrichedData;
    if (satker) {
      filteredData = filteredData.filter(item => 
        item.relasi_data && item.relasi_data.kd_satker === satker
      );
    }
    if (bidang) {
      filteredData = filteredData.filter(item => 
        item.relasi_data && item.relasi_data.bidangf === bidang
      );
    }

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      data: filteredData,
      pagination: {
        totalItems: filteredData.length,
        totalPages: Math.ceil(filteredData.length / limit),
        currentPage: page,
        itemsPerPage: limit
      },
      searchQuery: search || null,
      filter: { satker, bidang }
    });

  } catch (error) {
    console.error('GetLevel3Data Error:', error);
    res.status(500).json({ error: error.message });
  }
};
const getViewDaftarUnitKerjaStats = async (req, res) => {
  try {
    const stats = await ViewDaftarUnitKerja.findAll({
      where: { status: '1' },
      attributes: [
        'jenis',
        [Sequelize.fn('COUNT', Sequelize.col('jenis')), 'count']
      ],
      group: ['jenis'],
      raw: true
    });

    const totalCount = await ViewDaftarUnitKerja.count({
      where: { status: '1' }
    });

    res.json({
      total: totalCount,
      by_jenis: stats
    });

  } catch (error) {
    console.error('GetViewDaftarUnitKerjaStats Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan filter options untuk dropdown (hanya kode dan nama)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getFilterOptions = async (req, res) => {
  try {
    const { jenis, search, limit = 50 } = req.query;
    
    if (!jenis) {
      return res.status(400).json({ error: 'Parameter jenis diperlukan' });
    }

    // Build kondisi where
    let whereCondition = {
      status: '1'
      // Sementara nonaktifkan filter jenis karena masalah collation
      // jenis: jenis
    };

    // Tambahkan search jika ada
    if (search) {
      whereCondition[Op.or] = [
        { kd_unit_kerja: { [Op.like]: `%${search}%` } },
        { nm_unit_kerja: { [Op.like]: `%${search}%` } }
      ];
    }

    // Ambil semua data untuk filter di backend
    const allData = await ViewDaftarUnitKerja.findAll({
      where: whereCondition,
      attributes: ['kd_unit_kerja', 'nm_unit_kerja', 'jenis'], // Tambahkan jenis untuk filter
      order: [['nm_unit_kerja', 'ASC']]
    });

    // Filter data berdasarkan jenis di backend
    const filteredData = allData.filter(item => item.jenis === jenis);
    
    // Apply limit setelah filter
    const data = filteredData.slice(0, parseInt(limit));

    res.json({
      data: data,
      total: data.length,
      jenis: jenis,
      searchQuery: search || null
    });

  } catch (error) {
    console.error('GetFilterOptions Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getFilterOptionsHierarchy = async (req, res) => {
  try {
    const { kd_kerja_level1, kd_kerja_level2 } = req.params;
    const { search, limit = 50 } = req.query;

    let whereCondition = {
      status: '1'
    };

    if (search) {
      whereCondition[Op.or] = [
        { kd_unit_kerja: { [Op.like]: `%${search}%` } },
        { nm_unit_kerja: { [Op.like]: `%${search}%` } }
      ];
    }

    // Jika tidak ada parameter, return level 1 (satker_tbl)
    if (!kd_kerja_level1) {
      const allData = await ViewDaftarUnitKerja.findAll({
        where: whereCondition,
        attributes: ['kd_unit_kerja', 'nm_unit_kerja', 'jenis'],
        order: [['nm_unit_kerja', 'ASC']]
      });

      const filteredData = allData.filter(item => item.jenis === 'satker_tbl');
      const data = filteredData.slice(0, parseInt(limit));

      return res.json({
        data: data,
        total: data.length,
        level: 1,
        searchQuery: search || null
      });
    }

    // Jika ada kd_kerja_level1, return level 2 (bidang_tbl) yang memiliki atasan = kd_kerja_level1
    if (kd_kerja_level1 && !kd_kerja_level2) {
      const allData = await ViewDaftarUnitKerja.findAll({
        where: whereCondition,
        attributes: ['kd_unit_kerja', 'nm_unit_kerja', 'jenis', 'kd_unit_atasan'],
        order: [['nm_unit_kerja', 'ASC']]
      });

      const filteredData = allData.filter(item => 
        item.jenis === 'bidang_tbl' && item.kd_unit_atasan === kd_kerja_level1
      );
      const data = filteredData.slice(0, parseInt(limit));

      return res.json({
        data: data,
        total: data.length,
        level: 2,
        parent_kd: kd_kerja_level1,
        searchQuery: search || null
      });
    }

    // Jika ada kd_kerja_level1 dan kd_kerja_level2, return level 3 (bidang_sub) yang memiliki atasan = kd_kerja_level2
    if (kd_kerja_level1 && kd_kerja_level2) {
      const allData = await ViewDaftarUnitKerja.findAll({
        where: whereCondition,
        attributes: ['kd_unit_kerja', 'nm_unit_kerja', 'jenis', 'kd_unit_atasan'],
        order: [['nm_unit_kerja', 'ASC']]
      });

      const filteredData = allData.filter(item => 
        item.jenis === 'bidang_sub' && item.kd_unit_atasan === kd_kerja_level2
      );
      const data = filteredData.slice(0, parseInt(limit));

      return res.json({
        data: data,
        total: data.length,
        level: 3,
        parent_kd: kd_kerja_level2,
        grandparent_kd: kd_kerja_level1,
        searchQuery: search || null
      });
    }

  } catch (error) {
    console.error('GetFilterOptionsHierarchy Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllViewDaftarUnitKerja,
  getLevel1DataNoView,
  getLevel2DataNoView,
  getLevel3DataNoView,
  getViewDaftarUnitKerjaById,
  getViewDaftarUnitKerjaStats,
  getFilterOptions,
  getFilterOptionsHierarchy
};
