const { SatkerTbl, BidangTbl, BidangSub } = require('../models');
const { getEffectiveLocation, getLocationHierarchy, createOrUpdateLocation, getLocationsBySatker } = require('../utils/lokasiHierarchyUtils');
const { getEffectiveJamDinas, createOrUpdateJamDinasAssignment, deleteJamDinasAssignment } = require('../utils/jamDinasHierarchyUtils');

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
          lokasi: lokasi // Lokasi langsung di level satker
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

const getSatkerOptions = async (req, res) => {
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
      attributes: ['KDSATKER', 'NMSATKER']
    });

    res.json({ data: satkerList, pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: parseInt(page), itemsPerPage: parseInt(limit) } });
  } catch (error) {
    console.error('GetSatkerOptions Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getBidangOptions = async (req, res) => {
  try {
    const { search, satker, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {
      KDSATKER: satker,
      STATUS_BIDANG: '1'
    };

    const { count, rows: bidangList } = await BidangTbl.findAndCountAll({
      where: whereCondition,
      attributes: ['BIDANGF', 'NMBIDANG'],
      order: [['NMBIDANG', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    if (search) {
      bidangWhereCondition[require('sequelize').Op.or] = [
        { BIDANGF: { [require('sequelize').Op.like]: `%${search}%` } },
        { NMBIDANG: { [require('sequelize').Op.like]: `%${search}%` } }
      ];
    }

    res.json({ data: bidangList, pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: parseInt(page), itemsPerPage: parseInt(limit) } });

  } catch (error) {
    console.error('GetBidangOptions Error:', error);
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

    // Ambil jam dinas yang efektif untuk satker ini
    const jamDinasAssignments = await getEffectiveJamDinas(idSatker);

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
          lokasi: lokasi // Lokasi langsung di level bidang
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
      jamDinas: jamDinasAssignments,
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
          lokasi: lokasi // Lokasi langsung di level sub-bidang
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

    // Ambil lokasi khusus level bidang (termasuk yang status false)
    const { Lokasi } = require('../models');
    const bidangLocation = await Lokasi.findOne({
      where: {
        id_satker: idSatker,
        id_bidang: idBidang
      },
      order: [
        ['status', 'DESC'], // utamakan yang aktif jika ada
        ['updatedAt', 'DESC']
      ]
    });

    // Ambil lokasi satker
    const satkerLocation = await getEffectiveLocation(idSatker);

    // Susun daftar lokasi yang relevan untuk bidang: satker (aktif) + bidang (bisa aktif/non-aktif)
    const bidangLokasiList = [];
    if (satkerLocation) {
      bidangLokasiList.push(satkerLocation);
    }
    if (bidangLocation) {
      const lokasiObj = bidangLocation.toJSON();
      bidangLokasiList.push({
        ...lokasiObj,
        level: 'bidang',
        source: 'bidang'
      });
    }

    // Ambil jam dinas yang efektif untuk bidang ini
    const jamDinasAssignments = await getEffectiveJamDinas(idSatker, idBidang);

    res.json({
      satker: {
        ...satker.toJSON(),
        lokasi: satkerLocation // Lokasi satker
      },
      bidang: {
        ...bidang.toJSON(),
        totalSubBidangCount,
        lokasi: bidangLocation ? bidangLocation.toJSON() : null,
        lokasi_list: bidangLokasiList
      },
      jamDinas: jamDinasAssignments,
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

    // Ambil jam dinas yang efektif untuk sub-bidang ini (inherit dari bidang/satker)
    const jamDinasAssignments = await getEffectiveJamDinas(idSatker, idBidang);

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
      },
      jamDinas: jamDinasAssignments
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

/**
 * Mengaktifkan lokasi yang non-aktif
 */
const activateLocation = async (req, res) => {
  try {
    const { idSatker, idBidang } = req.params;

    // Cari lokasi yang non-aktif berdasarkan level
    let whereCondition = {
      id_satker: idSatker,
      status: false
    };

    if (idBidang) {
      whereCondition.id_bidang = idBidang;
    } else {
      whereCondition.id_bidang = null;
    }

    const { Lokasi } = require('../models');
    
    // Cari lokasi yang non-aktif
    const existingLocation = await Lokasi.findOne({
      where: whereCondition
    });

    if (!existingLocation) {
      return res.status(404).json({ 
        error: 'Lokasi non-aktif tidak ditemukan' 
      });
    }

    // Aktifkan lokasi
    await existingLocation.update({ 
      status: true,
      updatedAt: new Date()
    });

    // Ambil lokasi yang sudah diaktifkan
    const activatedLocation = await Lokasi.findByPk(existingLocation.lokasi_id);

    res.json({
      message: 'Lokasi berhasil diaktifkan',
      data: activatedLocation
    });
  } catch (error) {
    console.error('ActivateLocation Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Assign atau update jam dinas untuk satker/bidang
 */
const assignJamDinas = async (req, res) => {
  try {
    const { idSatker, idBidang } = req.params;
    const { idJamDinas } = req.body;

    // Validasi input
    if (!idJamDinas) {
      return res.status(400).json({ 
        error: 'ID Jam Dinas wajib diisi' 
      });
    }

    const assignmentData = {
      idSatker,
      idBidang: idBidang || null,
      idJamDinas: parseInt(idJamDinas),
      assignmentName: null, // Akan otomatis diisi di utility
      status: 1
    };

    const assignment = await createOrUpdateJamDinasAssignment(assignmentData);

    res.json({
      message: 'Jam dinas berhasil diassign',
      data: assignment
    });
  } catch (error) {
    console.error('AssignJamDinas Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Hapus jam dinas assignment
 */
const removeJamDinasAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const result = await deleteJamDinasAssignment(assignmentId);

    res.json(result);
  } catch (error) {
    console.error('RemoveJamDinasAssignment Error:', error);
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
  getSatkerLocations,
  activateLocation,
  assignJamDinas,
  removeJamDinasAssignment,
  getSatkerOptions,
  getBidangOptions
};
