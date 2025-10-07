const { SatkerTbl, BidangTbl, BidangSub } = require('../models');
const { getEffectiveLocation, getLocationHierarchy, createOrUpdateLocation, getLocationsBySatker } = require('../utils/lokasiHierarchyUtils');

/**
 * Mendapatkan semua satker (Level 1)
 */
const getAllSatker = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = { STATUS_SATKER: '1' };

    // Tambahkan search jika ada
    if (search) {
      whereCondition[require('sequelize').Op.or] = [
        { KDSATKER: { [require('sequelize').Op.like]: `%${search}%` } },
        { NMSATKER: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: satkerList } = await SatkerTbl.findAndCountAll({
      where: whereCondition,
      attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN', 'KDSKPD'],
      order: [['NMSATKER', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Hitung total bidang dan ambil lokasi untuk setiap satker
    const satkerWithCounts = await Promise.all(
      satkerList.map(async (satker) => {
        const bidangCount = await BidangTbl.count({
          where: {
            KDSATKER: satker.KDSATKER,
            STATUS_BIDANG: '1'
          }
        });
        
        // Ambil lokasi satker
        const lokasi = await getEffectiveLocation(satker.KDSATKER);
        
        return {
          ...satker.toJSON(),
          bidangCount,
          lokasi
        };
      })
    );

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: satkerWithCounts,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      },
      searchQuery: search || null
    });
  } catch (error) {
    console.error('GetAllSatker Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan detail satker beserta bidang-bidangnya
 */
const getSatkerDetail = async (req, res) => {
  try {
    const { idSatker } = req.params;
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Ambil detail satker
    const satker = await SatkerTbl.findOne({
      where: { 
        KDSATKER: idSatker,
        STATUS_SATKER: '1'
      },
      attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN', 'KDSKPD']
    });

    if (!satker) {
      return res.status(404).json({ error: "Satker tidak ditemukan" });
    }

    // Ambil bidang-bidang di satker ini
    let bidangWhereCondition = { 
      KDSATKER: idSatker,
      STATUS_BIDANG: '1'
    };

    if (search) {
      bidangWhereCondition[require('sequelize').Op.or] = [
        { BIDANGF: { [require('sequelize').Op.like]: `%${search}%` } },
        { NMBIDANG: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: bidangList } = await BidangTbl.findAndCountAll({
      where: bidangWhereCondition,
      attributes: ['BIDANGF', 'NMBIDANG', 'NAMA_JABATAN', 'JENIS_JABATAN', 'KDSATKER'],
      order: [['NMBIDANG', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Hitung total sub-bidang dan ambil lokasi untuk setiap bidang
    const bidangWithCounts = await Promise.all(
      bidangList.map(async (bidang) => {
        const subBidangCount = await BidangSub.count({
          where: {
            BIDANGF: bidang.BIDANGF,
            STATUS_SUB: '1'
          }
        });
        
        // Ambil lokasi bidang
        const lokasi = await getEffectiveLocation(idSatker, bidang.BIDANGF);
        
        return {
          ...bidang.toJSON(),
          subBidangCount,
          lokasi
        };
      })
    );

    const totalPages = Math.ceil(count / limit);

    // Ambil lokasi satker
    const satkerLocation = await getEffectiveLocation(idSatker);

    res.json({
      satker: {
        ...satker.toJSON(),
        lokasi: satkerLocation
      },
      bidang: {
        data: bidangWithCounts,
        pagination: {
          totalItems: count,
          totalPages,
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit)
        }
      },
      searchQuery: search || null
    });
  } catch (error) {
    console.error('GetSatkerDetail Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan detail bidang beserta sub-bidangnya
 */
const getBidangDetail = async (req, res) => {
  try {
    const { idSatker, idBidang } = req.params;
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Ambil detail satker
    const satker = await SatkerTbl.findOne({
      where: { 
        KDSATKER: idSatker,
        STATUS_SATKER: '1'
      },
      attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN', 'KDSKPD']
    });

    if (!satker) {
      return res.status(404).json({ error: "Satker tidak ditemukan" });
    }

    // Ambil detail bidang
    const bidang = await BidangTbl.findOne({
      where: { 
        BIDANGF: idBidang,
        KDSATKER: idSatker,
        STATUS_BIDANG: '1'
      },
      attributes: ['BIDANGF', 'NMBIDANG', 'NAMA_JABATAN', 'JENIS_JABATAN', 'KDSATKER']
    });

    if (!bidang) {
      return res.status(404).json({ error: "Bidang tidak ditemukan" });
    }

    // Ambil sub-bidang di bidang ini
    let subBidangWhereCondition = { 
      BIDANGF: idBidang,
      STATUS_SUB: '1'
    };

    if (search) {
      subBidangWhereCondition[require('sequelize').Op.or] = [
        { SUBF: { [require('sequelize').Op.like]: `%${search}%` } },
        { NMSUB: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: subBidangList } = await BidangSub.findAndCountAll({
      where: subBidangWhereCondition,
      attributes: ['SUBF', 'NMSUB', 'NAMA_JABATAN', 'BIDANGF'],
      order: [['NMSUB', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Tambahkan lokasi untuk setiap sub-bidang
    const subBidangWithLocations = await Promise.all(
      subBidangList.map(async (subBidang) => {
        const lokasi = await getEffectiveLocation(idSatker, idBidang, subBidang.SUBF);
        
        return {
          ...subBidang.toJSON(),
          lokasi
        };
      })
    );

    // Hitung total sub-bidang untuk bidang ini (untuk informasi)
    const totalSubBidangCount = await BidangSub.count({
      where: {
        BIDANGF: idBidang,
        STATUS_SUB: '1'
      }
    });

    const totalPages = Math.ceil(count / limit);

    // Ambil lokasi yang efektif untuk bidang ini
    const bidangLocation = await getEffectiveLocation(idSatker, idBidang);

    res.json({
      satker: {
        ...satker.toJSON(),
        lokasi: await getEffectiveLocation(idSatker) // Lokasi satker
      },
      bidang: {
        ...bidang.toJSON(),
        totalSubBidangCount,
        lokasi: bidangLocation
      },
      subBidang: {
        data: subBidangWithLocations,
        pagination: {
          totalItems: count,
          totalPages,
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit)
        }
      },
      searchQuery: search || null
    });
  } catch (error) {
    console.error('GetBidangDetail Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan detail sub-bidang
 */
const getSubBidangDetail = async (req, res) => {
  try {
    const { idSatker, idBidang, idSubBidang } = req.params;

    // Ambil detail satker
    const satker = await SatkerTbl.findOne({
      where: { 
        KDSATKER: idSatker,
        STATUS_SATKER: '1'
      },
      attributes: ['KDSATKER', 'NMSATKER', 'NAMA_JABATAN', 'JENIS_JABATAN', 'KDSKPD']
    });

    if (!satker) {
      return res.status(404).json({ error: "Satker tidak ditemukan" });
    }

    // Ambil detail bidang
    const bidang = await BidangTbl.findOne({
      where: { 
        BIDANGF: idBidang,
        KDSATKER: idSatker,
        STATUS_BIDANG: '1'
      },
      attributes: ['BIDANGF', 'NMBIDANG', 'NAMA_JABATAN', 'JENIS_JABATAN', 'KDSATKER']
    });

    if (!bidang) {
      return res.status(404).json({ error: "Bidang tidak ditemukan" });
    }

    // Ambil detail sub-bidang
    const subBidang = await BidangSub.findOne({
      where: { 
        SUBF: idSubBidang,
        BIDANGF: idBidang,
        STATUS_SUB: '1'
      },
      attributes: ['SUBF', 'NMSUB', 'NAMA_JABATAN', 'BIDANGF']
    });

    if (!subBidang) {
      return res.status(404).json({ error: "Sub Bidang tidak ditemukan" });
    }

    // Ambil lokasi yang efektif untuk sub-bidang ini
    const subBidangLocation = await getEffectiveLocation(idSatker, idBidang, idSubBidang);

    res.json({
      satker: {
        ...satker.toJSON(),
        lokasi: await getEffectiveLocation(idSatker) // Lokasi satker
      },
      bidang: {
        ...bidang.toJSON(),
        lokasi: await getEffectiveLocation(idSatker, idBidang) // Lokasi bidang
      },
      subBidang: {
        ...subBidang.toJSON(),
        lokasi: subBidangLocation
      }
    });
  } catch (error) {
    console.error('GetSubBidangDetail Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mengatur lokasi untuk satker/bidang/sub-bidang
 */
const setLocation = async (req, res) => {
  try {
    const { idSatker, idBidang, idSubBidang } = req.params;
    const { lat, lng, range, ket, status = true } = req.body;

    // Validasi input
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude dan longitude wajib diisi' });
    }

    // Validasi koordinat
    if (lat < -90 || lat > 90) {
      return res.status(400).json({ error: 'Latitude harus antara -90 dan 90' });
    }
    if (lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Longitude harus antara -180 dan 180' });
    }

    const locationData = {
      idSatker,
      idBidang: idBidang || null,
      idSubBidang: idSubBidang || null,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      range: parseInt(range) || 100,
      ket,
      status
    };

    const location = await createOrUpdateLocation(locationData);

    res.json({
      message: 'Lokasi berhasil disimpan',
      data: location
    });
  } catch (error) {
    console.error('SetLocation Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan hierarki lokasi untuk satker
 */
const getLocationHierarchyController = async (req, res) => {
  try {
    const { idSatker } = req.params;
    const hierarchy = await getLocationHierarchy(idSatker);
    res.json(hierarchy);
  } catch (error) {
    console.error('GetLocationHierarchy Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan semua lokasi untuk satker
 */
const getSatkerLocations = async (req, res) => {
  try {
    const { idSatker } = req.params;
    const locations = await getLocationsBySatker(idSatker);
    res.json({ data: locations });
  } catch (error) {
    console.error('GetSatkerLocations Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllSatker,
  getSatkerDetail,
  getBidangDetail,
  getSubBidangDetail,
  setLocation,
  getLocationHierarchyController,
  getSatkerLocations
};
