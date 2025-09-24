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
  const { search, id_skpd, id_satker, id_bidang, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Build where condition
    let whereCondition = {};
    
    // Filter berdasarkan organizational ID
    // Support untuk filter null values dengan string "null"
    if (id_skpd !== undefined) {
      whereCondition.id_skpd = id_skpd === 'null' ? null : id_skpd;
    }
    
    if (id_satker !== undefined) {
      whereCondition.id_satker = id_satker === 'null' ? null : id_satker;
    }
    
    if (id_bidang !== undefined) {
      whereCondition.id_bidang = id_bidang === 'null' ? null : id_bidang;
    }

    // Filter status lokasi (1 = aktif, 0 = nonaktif)
    if (status !== undefined) {
      if (status === '1' || status === 1) {
        whereCondition.status = true;
      } else if (status === '0' || status === 0) {
        whereCondition.status = false;
      }
    }
    
    // Jika ada parameter search, tambahkan kondisi pencarian
    if (search) {
      const searchCondition = {
        [Op.or]: [
          {
            ket: {
              [Op.like]: `%${search}%`
            }
          },
          {
            id_skpd: {
              [Op.like]: `%${search}%`
            }
          },
          {
            id_satker: {
              [Op.like]: `%${search}%`
            }
          },
          {
            id_bidang: {
              [Op.like]: `%${search}%`
            }
          }
        ]
      };
      
      // Gabungkan filter organisasi dengan search condition
      if (Object.keys(whereCondition).length > 0) {
        whereCondition = {
          [Op.and]: [
            whereCondition,
            searchCondition
          ]
        };
      } else {
        whereCondition = searchCondition;
      }
    }

    // Ambil data lokasi dengan atau tanpa filter pencarian
    const lokasis = await Lokasi.findAll({
      where: whereCondition,
      offset,
      limit,
      order: [['lokasi_id', 'DESC']]
    });

    // Tambahkan data organisasi untuk setiap lokasi
    const lokasisWithOrgData = await Promise.all(
      lokasis.map(async (loc) => await getOrganizationData(loc))
    );

    // Hitung total data
    const totalItems = await Lokasi.count({
      where: whereCondition
    });
    const totalPages = Math.ceil(totalItems / limit);

    const pagination = {
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
    };

    // Build response message
    let message = "Data lokasi berhasil diambil";
    const filters = [];
    
    if (id_skpd !== undefined) {
      filters.push(`SKPD: ${id_skpd === 'null' ? 'NULL' : id_skpd}`);
    }
    if (id_satker !== undefined) {
      filters.push(`Satker: ${id_satker === 'null' ? 'NULL' : id_satker}`);
    }
    if (id_bidang !== undefined) {
      filters.push(`Bidang: ${id_bidang === 'null' ? 'NULL' : id_bidang}`);
    }
    if (status !== undefined) {
      const statusText = status === '1' || status === 1 ? 'Aktif' : 'Tidak Aktif';
      filters.push(`Status: ${statusText}`);
    }
    if (search) filters.push(`Search: "${search}"`);
    
    if (filters.length > 0) {
      message = `Ditemukan ${lokasisWithOrgData.length} lokasi dengan filter [${filters.join(', ')}]`;
    }

    return res.status(200).json({
      message,
      data: lokasisWithOrgData,
      pagination,
      filters: {
        id_skpd: id_skpd !== undefined ? (id_skpd === 'null' ? null : id_skpd) : undefined,
        id_satker: id_satker !== undefined ? (id_satker === 'null' ? null : id_satker) : undefined,
        id_bidang: id_bidang !== undefined ? (id_bidang === 'null' ? null : id_bidang) : undefined,
        status: status !== undefined ? (status === '1' || status === 1 ? true : false) : undefined,
        search: search || null
      }
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
    
    console.log('Update lokasi request:', {
      lokasi_id,
      body: req.body
    });

    const lokasi = await Lokasi.findOne({ where: { lokasi_id } });

    if (!lokasi) {
      return res.status(404).json({ message: "Lokasi tidak ditemukan" });
    }

    // Hanya update field yang ada di request body (PATCH behavior)
    const updateData = {};
    
    if (req.body.lat !== undefined) updateData.lat = req.body.lat;
    if (req.body.lng !== undefined) updateData.lng = req.body.lng;
    if (req.body.range !== undefined) updateData.range = req.body.range;
    if (req.body.ket !== undefined) updateData.ket = req.body.ket;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    
    // Handle organizational fields - allow null values untuk unset
    if (req.body.hasOwnProperty('id_skpd')) updateData.id_skpd = req.body.id_skpd;
    if (req.body.hasOwnProperty('id_satker')) updateData.id_satker = req.body.id_satker;
    if (req.body.hasOwnProperty('id_bidang')) updateData.id_bidang = req.body.id_bidang;

    console.log('Fields to update:', updateData);

    await lokasi.update(updateData);

    // Refresh data setelah update
    await lokasi.reload();
    
    // Tambahkan data organisasi untuk response
    const lokasiWithOrgData = await getOrganizationData(lokasi);

    return res.status(200).json({ 
      message: "Lokasi berhasil diupdate",
      data: lokasiWithOrgData
    });
  } catch (error) {
    console.error('UpdateLokasi Error:', error);
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

module.exports = { 
  getMyLocation,
  createLokasi, 
  getLokasi, 
  getLokasiById, 
  updateLokasi, 
  deleteLokasi
};