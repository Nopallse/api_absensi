const { Lokasi } = require('../models');
const { 
  getEffectiveLocation, 
  createOrUpdateLocation, 
  deleteLocation, 
  getLocationHierarchy 
} = require('../utils/lokasiInheritanceUtils');

/**
 * Mendapatkan semua lokasi dengan pagination
 */
const getAllLokasi = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    let whereCondition = { status: true };


    // Search
    const { Op } = require('sequelize');

    // Filter: jangan tampilkan yang id_satker, id_bidang, id_sub_bidang nya null
    // Tampilkan jika setidaknya salah satu dari id_satker, id_bidang, id_sub_bidang tidak null
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        { id_satker: { [Op.ne]: null } },
        { id_bidang: { [Op.ne]: null } },
        { id_sub_bidang: { [Op.ne]: null } }
      ]
    };

    if (search) {
      // Gabungkan pencarian dengan kondisi OR di atas
      whereCondition[Op.and] = [
        ...(whereCondition[Op.and] || []),
        {
          [Op.or]: [
            { ket: { [Op.like]: `%${search}%` } }
          ]
        }
      ];
    }

    const { count, rows: lokasi } = await Lokasi.findAndCountAll({
      where: whereCondition,
      order: [
        ['id_satker', 'ASC'],
        ['id_bidang', 'ASC'],
        ['id_sub_bidang', 'ASC'],
        ['lokasi_id', 'ASC']
      ],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: lokasi,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('GetAllLokasi Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan lokasi berdasarkan ID
 */
const getLokasiById = async (req, res) => {
  try {
    const { id } = req.params;

    const lokasi = await Lokasi.findOne({
      where: { lokasi_id: id, status: true }
    });

    if (!lokasi) {
      return res.status(404).json({ error: "Lokasi tidak ditemukan" });
    }

    res.json(lokasi);
  } catch (error) {
    console.error('GetLokasiById Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan lokasi efektif untuk unit kerja
 */
const getEffectiveLocationController = async (req, res) => {
  try {
    console.log('req.params', req.params);
    const { kd_unit_kerja } = req.params;
    console.log('kd_unit_kerja', kd_unit_kerja);
    const lokasi = await getEffectiveLocation(kd_unit_kerja);

    if (!lokasi) {
      return res.status(404).json({ error: "Lokasi tidak ditemukan untuk unit kerja ini" });
    }

    res.json(lokasi);
  } catch (error) {
    console.error('GetEffectiveLocation Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan hierarki lokasi untuk unit kerja
 */
const getLocationHierarchyController = async (req, res) => {
  try {
    const { kd_unit_kerja } = req.params;

    const locations = await getLocationHierarchy(kd_unit_kerja);

    res.json({
      data: locations,
      total: locations.length
    });
  } catch (error) {
    console.error('GetLocationHierarchy Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Membuat lokasi baru
 */
const createLokasi = async (req, res) => {
  try {
    const lokasiData = req.body;
    const createdBy = req.user?.username || 'system';

    const lokasi = await createOrUpdateLocation(lokasiData, createdBy);

    res.status(201).json({
      message: "Lokasi berhasil dibuat",
      data: lokasi
    });
  } catch (error) {
    console.error('CreateLokasi Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mengupdate lokasi
 */
const updateLokasi = async (req, res) => {
  try {
    const { id } = req.params;
    const lokasiData = req.body;
    const updatedBy = req.user?.username || 'system';

    // Cek apakah lokasi ada
    const existingLokasi = await Lokasi.findOne({
      where: { lokasi_id: id, status: true }
    });

    if (!existingLokasi) {
      return res.status(404).json({ error: "Lokasi tidak ditemukan" });
    }

    // Update data
    const updatedData = {
      ...lokasiData,
      updated_by: updatedBy
    };

    await existingLokasi.update(updatedData);

    // Update child locations jika diperlukan
    if (lokasiData.lat && lokasiData.lng) {
      await updateChildLocations(existingLokasi.kd_unit_kerja, existingLokasi);
    }

    res.json({
      message: "Lokasi berhasil diupdate",
      data: existingLokasi
    });
  } catch (error) {
    console.error('UpdateLokasi Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Menghapus lokasi
 */
const deleteLokasi = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.username || 'system';

    // Cek apakah lokasi ada
    const existingLokasi = await Lokasi.findOne({
      where: { lokasi_id: id, status: true }
    });

    if (!existingLokasi) {
      return res.status(404).json({ error: "Lokasi tidak ditemukan" });
    }

    await deleteLocation(existingLokasi.kd_unit_kerja, deletedBy);

    res.json({
      message: "Lokasi berhasil dihapus"
    });
  } catch (error) {
    console.error('DeleteLokasi Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan lokasi berdasarkan level unit kerja
 */
const getLokasiByLevel = async (req, res) => {
  try {
    const { level } = req.params;
    const { kd_unit_kerja } = req.query;

    let whereCondition = { 
      status: true 
    };

    // Filter berdasarkan level menggunakan id_satker, id_bidang, id_sub_bidang
    if (level === '1') {
      whereCondition.id_satker = { [require('sequelize').Op.ne]: null };
      whereCondition.id_bidang = null;
      whereCondition.id_sub_bidang = null;
    } else if (level === '2') {
      whereCondition.id_bidang = { [require('sequelize').Op.ne]: null };
      whereCondition.id_sub_bidang = null;
    } else if (level === '3') {
      whereCondition.id_sub_bidang = { [require('sequelize').Op.ne]: null };
    }

    // Filter berdasarkan kode unit kerja parent
    if (kd_unit_kerja) {
      whereCondition[require('sequelize').Op.or] = [
        { id_satker: { [require('sequelize').Op.like]: `${kd_unit_kerja}%` } },
        { id_bidang: { [require('sequelize').Op.like]: `${kd_unit_kerja}%` } },
        { id_sub_bidang: { [require('sequelize').Op.like]: `${kd_unit_kerja}%` } }
      ];
    }

    const lokasi = await Lokasi.findAll({
      where: whereCondition,
      order: [['lokasi_id', 'ASC']]
    });

    res.json({
      data: lokasi,
      total: lokasi.length,
      level: parseInt(level)
    });
  } catch (error) {
    console.error('GetLokasiByLevel Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllLokasi,
  getLokasiById,
  getEffectiveLocationController,
  getLocationHierarchyController,
  createLokasi,
  updateLokasi,
  deleteLokasi,
  getLokasiByLevel
};