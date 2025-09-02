const { Lokasi, MstPegawai, SkpdTbl, SatkerTbl, BidangTbl } = require("../models");

const Sequelize = require("sequelize");
const { Op } = Sequelize;

// Helper function untuk mendapatkan data organisasi lengkap
const getOrganizationData = async (lokasi) => {
  const result = { ...lokasi.toJSON() };
  
  try {
    // Ambil data SKPD jika ada
    if (lokasi.id_skpd) {
      const skpdData = await SkpdTbl.findByPk(lokasi.id_skpd);
      result.skpd_data = skpdData ? skpdData.toJSON() : null;
    }

    // Ambil data Satker jika ada
    if (lokasi.id_satker) {
      const satkerData = await SatkerTbl.findByPk(lokasi.id_satker);
      result.satker_data = satkerData ? satkerData.toJSON() : null;
    }

    // Ambil data Bidang jika ada
    if (lokasi.id_bidang) {
      const bidangData = await BidangTbl.findByPk(lokasi.id_bidang);
      result.bidang_data = bidangData ? bidangData.toJSON() : null;
    }
  } catch (error) {
    console.error('Error getting organization data:', error);
    // Jika ada error, tetap return data lokasi tanpa data organisasi
  }

  return result;
};

// Mendapatkan lokasi user berdasarkan SKPD/Satker/Bidang
const getMyLocation = async (req, res) => {
  try {
    const userNip = req.user.username;
    
    // Dapatkan data pegawai dari database master berdasarkan NIP
    const pegawai = await MstPegawai.findOne({
      where: { NIP: userNip }
    });

    if (!pegawai) {
      return res.status(404).json({ 
        message: "Data pegawai tidak ditemukan" 
      });
    }

    // Ambil lokasi berdasarkan SKPD/Satker/Bidang pegawai
    const lokasi = await Lokasi.findAll({
      where: {
        [Op.or]: [
          { id_skpd: pegawai.KDSKPD },
          { id_satker: pegawai.KDSATKER },
          { id_bidang: pegawai.KDBIDANG }
        ],
        status: true
      }
    });

    // Tambahkan data organisasi untuk setiap lokasi
    const lokasiWithOrgData = await Promise.all(
      lokasi.map(async (loc) => await getOrganizationData(loc))
    );

    return res.status(200).json({
      data: lokasiWithOrgData,
      pegawai_info: {
        nip: pegawai.NIP,
        nama: pegawai.NAMA,
        kdskpd: pegawai.KDSKPD,
        kdsatker: pegawai.KDSATKER,
        kdbidang: pegawai.KDBIDANG
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      message: "Terjadi kesalahan server" 
    });
  }
};

const createLokasi = async (req, res) => {
  try {
    const { lat, lng, range, id_skpd, id_satker, id_bidang, ket, status } = req.body;
    console.log(req.body);
    if (!lat || !lng || !range) {
      return res.status(400).json({ message: "Latitude, longitude, dan range harus diisi" });
    }

    const newLokasi = await Lokasi.create({
      lat,
      lng,
      range,
      id_skpd: id_skpd || null,
      id_satker: id_satker || null,
      id_bidang: id_bidang || null,
      ket: ket || null,
      status: status !== undefined ? status : true,
    });

    // Tambahkan data organisasi
    const lokasiWithOrgData = await getOrganizationData(newLokasi);

    return res.status(201).json({
      message: "Lokasi berhasil dibuat",
      data: lokasiWithOrgData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const getLokasi = async (req, res) => {
  try {
    //use pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    //ambil semua data
    const lokasis = await Lokasi.findAll({
      offset,
      limit,
    });

    // Tambahkan data organisasi untuk setiap lokasi
    const lokasisWithOrgData = await Promise.all(
      lokasis.map(async (loc) => await getOrganizationData(loc))
    );

    const totalItems = await Lokasi.count();
    const totalPages = Math.ceil(totalItems / limit);

    const pagination = {
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
    };

    return res.status(200).json({
      data: lokasisWithOrgData,
      pagination,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const getLokasiById = async (req, res) => {
  try {
    const { lokasi_id } = req.params;

    const lokasi = await Lokasi.findOne({ where: { lokasi_id } });

    if (!lokasi) {
      return res.status(404).json({ message: "Lokasi tidak ditemukan" });
    }

    // Tambahkan data organisasi
    const lokasiWithOrgData = await getOrganizationData(lokasi);

    return res.status(200).json({ data: lokasiWithOrgData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const updateLokasi = async (req, res) => {
  try {
    const { lokasi_id } = req.params;
    const { lat, lng, range, id_skpd, id_satker, id_bidang, ket, status } = req.body;

    const lokasi = await Lokasi.findOne({ where: { lokasi_id } });

    if (!lokasi) {
      return res.status(404).json({ message: "Lokasi tidak ditemukan" });
    }

    await lokasi.update({ 
      lat, 
      lng, 
      range, 
      id_skpd: id_skpd || null,
      id_satker: id_satker || null,
      id_bidang: id_bidang || null,
      ket: ket || null,
      status: status !== undefined ? status : lokasi.status
    });

    // Tambahkan data organisasi untuk response
    const lokasiWithOrgData = await getOrganizationData(lokasi);

    return res.status(200).json({ 
      message: "Lokasi berhasil diupdate",
      data: lokasiWithOrgData
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const deleteLokasi = async (req, res) => {
  try {
    const { lokasi_id } = req.params;

    const lokasi = await Lokasi.findOne({ where: { lokasi_id } });

    if (!lokasi) {
      return res.status(404).json({ message: "Lokasi tidak ditemukan" });
    }

    await lokasi.destroy();

    return res.status(200).json({ message: "Lokasi berhasil dihapus" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

// Search lokasi berdasarkan ket (keterangan)
const searchLokasi = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: "Query pencarian harus diisi" });
    }

    // Ambil parameter pagination dari query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Cari lokasi berdasarkan ket (keterangan), id_skpd, id_satker, atau id_bidang
    const lokasis = await Lokasi.findAll({
      where: {
        [Sequelize.Op.or]: [
          {
            ket: {
              [Sequelize.Op.like]: `%${query}%`
            }
          },
          {
            id_skpd: {
              [Sequelize.Op.like]: `%${query}%`
            }
          },
          {
            id_satker: {
              [Sequelize.Op.like]: `%${query}%`
            }
          },
          {
            id_bidang: {
              [Sequelize.Op.like]: `%${query}%`
            }
          }
        ]
      },
      limit: limit,
      offset: offset,
    });

    // Tambahkan data organisasi untuk setiap lokasi
    const lokasisWithOrgData = await Promise.all(
      lokasis.map(async (loc) => await getOrganizationData(loc))
    );

    // Hitung total data untuk informasi pagination
    const totalItems = await Lokasi.count({
      where: {
        [Sequelize.Op.or]: [
          {
            ket: {
              [Sequelize.Op.like]: `%${query}%`
            }
          },
          {
            id_skpd: {
              [Sequelize.Op.like]: `%${query}%`
            }
          },
          {
            id_satker: {
              [Sequelize.Op.like]: `%${query}%`
            }
          },
          {
            id_bidang: {
              [Sequelize.Op.like]: `%${query}%`
            }
          }
        ]
      }
    });
    
    const totalPages = Math.ceil(totalItems / limit);

    if (lokasisWithOrgData.length === 0) {
      return res.status(404).json({ 
        message: "Lokasi tidak ditemukan",
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
          itemsPerPage: limit
        }
      });
    }

    return res.status(200).json({
      message: `Ditemukan ${lokasisWithOrgData.length} lokasi`,
      data: lokasisWithOrgData,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

module.exports = { 
  getMyLocation,
  createLokasi, 
  getLokasi, 
  getLokasiById, 
  updateLokasi, 
  deleteLokasi, 
  searchLokasi 
};