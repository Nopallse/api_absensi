const { Lokasi } = require('../models');

/**
 * Mendapatkan semua lokasi kegiatan
 */
const getAllLokasiKegiatan = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {
      id_satker: null,
      id_bidang: null,
      id_sub_bidang: null
    };

    // Tambahkan search jika ada
    if (search) {
      whereCondition[require('sequelize').Op.and] = [
        { id_satker: null },
        { id_bidang: null },
        { id_sub_bidang: null },
        {
          [require('sequelize').Op.or]: [
            { ket: { [require('sequelize').Op.like]: `%${search}%` } }
          ]
        }
      ];
    }

    const { count, rows: lokasiList } = await Lokasi.findAndCountAll({
      where: whereCondition,
      attributes: ['lokasi_id', 'lat', 'lng', 'range', 'ket', 'status', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: lokasiList,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      },
      searchQuery: search || null
    });
  } catch (error) {
    console.error('GetAllLokasiKegiatan Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mendapatkan detail lokasi kegiatan berdasarkan ID
 */
const getLokasiKegiatanById = async (req, res) => {
  try {
    const { id } = req.params;

    const lokasi = await Lokasi.findOne({
      where: { 
        lokasi_id: id,
        id_satker: null,
        id_bidang: null,
        id_sub_bidang: null
      },
      attributes: ['lokasi_id', 'lat', 'lng', 'range', 'ket', 'status', 'createdAt', 'updatedAt']
    });

    if (!lokasi) {
      return res.status(404).json({ error: "Lokasi kegiatan tidak ditemukan" });
    }

    res.json({
      data: lokasi
    });
  } catch (error) {
    console.error('GetLokasiKegiatanById Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Membuat lokasi kegiatan baru
 */
const createLokasiKegiatan = async (req, res) => {
  try {
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

    // Validasi range
    if (range && (range < 0 || range > 10000)) {
      return res.status(400).json({ error: 'Range harus antara 0 dan 10000 meter' });
    }

    const lokasiData = {
      id_satker: null,
      id_bidang: null,
      id_sub_bidang: null,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      range: parseInt(range) || 100,
      ket: ket || null,
      status: status
    };

    const lokasi = await Lokasi.create(lokasiData);

    res.status(201).json({
      message: 'Lokasi kegiatan berhasil dibuat',
      data: lokasi
    });
  } catch (error) {
    console.error('CreateLokasiKegiatan Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mengupdate lokasi kegiatan
 */
const updateLokasiKegiatan = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, range, ket, status } = req.body;

    // Cek apakah lokasi ada
    const lokasi = await Lokasi.findOne({
      where: { 
        lokasi_id: id,
        id_satker: null,
        id_bidang: null,
        id_sub_bidang: null
      }
    });

    if (!lokasi) {
      return res.status(404).json({ error: "Lokasi kegiatan tidak ditemukan" });
    }

    // Validasi koordinat jika ada
    if (lat !== undefined) {
      if (lat < -90 || lat > 90) {
        return res.status(400).json({ error: 'Latitude harus antara -90 dan 90' });
      }
    }

    if (lng !== undefined) {
      if (lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Longitude harus antara -180 dan 180' });
      }
    }

    // Validasi range jika ada
    if (range !== undefined && (range < 0 || range > 10000)) {
      return res.status(400).json({ error: 'Range harus antara 0 dan 10000 meter' });
    }

    // Update data
    const updateData = {};
    if (lat !== undefined) updateData.lat = parseFloat(lat);
    if (lng !== undefined) updateData.lng = parseFloat(lng);
    if (range !== undefined) updateData.range = parseInt(range);
    if (ket !== undefined) updateData.ket = ket;
    if (status !== undefined) updateData.status = status;

    await lokasi.update(updateData);

    // Ambil data terbaru
    const updatedLokasi = await Lokasi.findOne({
      where: { lokasi_id: id },
      attributes: ['lokasi_id', 'lat', 'lng', 'range', 'ket', 'status', 'createdAt', 'updatedAt']
    });

    res.json({
      message: 'Lokasi kegiatan berhasil diupdate',
      data: updatedLokasi
    });
  } catch (error) {
    console.error('UpdateLokasiKegiatan Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Menghapus lokasi kegiatan
 */
const deleteLokasiKegiatan = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah lokasi ada
    const lokasi = await Lokasi.findOne({
      where: { 
        lokasi_id: id,
        id_satker: null,
        id_bidang: null,
        id_sub_bidang: null
      }
    });

    if (!lokasi) {
      return res.status(404).json({ error: "Lokasi kegiatan tidak ditemukan" });
    }

    await lokasi.destroy();

    res.json({
      message: 'Lokasi kegiatan berhasil dihapus'
    });
  } catch (error) {
    console.error('DeleteLokasiKegiatan Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mengupdate status lokasi kegiatan (aktif/non-aktif)
 */
const updateStatusLokasiKegiatan = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (typeof status !== 'boolean') {
      return res.status(400).json({ error: 'Status harus berupa boolean (true/false)' });
    }

    // Cek apakah lokasi ada
    const lokasi = await Lokasi.findOne({
      where: { 
        lokasi_id: id,
        id_satker: null,
        id_bidang: null,
        id_sub_bidang: null
      }
    });

    if (!lokasi) {
      return res.status(404).json({ error: "Lokasi kegiatan tidak ditemukan" });
    }

    await lokasi.update({ status });

    res.json({
      message: `Lokasi kegiatan berhasil ${status ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: {
        id: lokasi.lokasi_id,
        status: status
      }
    });
  } catch (error) {
    console.error('UpdateStatusLokasiKegiatan Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllLokasiKegiatan,
  getLokasiKegiatanById,
  createLokasiKegiatan,
  updateLokasiKegiatan,
  deleteLokasiKegiatan,
  updateStatusLokasiKegiatan
};
