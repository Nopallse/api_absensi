const { ViewDaftarUnitKerja, SatkerTbl, BidangTbl, BidangSub } = require("../models");
const Sequelize = require("sequelize");
const { Op } = Sequelize;



/**
 * Mendapatkan data view_daftar_unit_kerja berdasarkan ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getViewDaftarUnitKerjaById = async (req, res) => {
  try {
    const { kd_unit_kerja } = req.params;

    // Cari data berdasarkan kd_unit_kerja
    const data = await ViewDaftarUnitKerja.findOne({
      where: {
        kd_unit_kerja: kd_unit_kerja,
        status: '1'
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Data unit kerja tidak ditemukan" });
    }

    // Enrich data berdasarkan jenis unit kerja
    let enrichedData;
    
    if (data.jenis === 'satker_tbl') {
      // Ambil data dari satker_tbl
      const satkerData = await ViewDaftarUnitKerja.sequelize.query(
        `SELECT KDSATKER, NMSATKER, NAMA_JABATAN, JENIS_JABATAN, KDSKPD FROM satker_tbl WHERE KDSATKER = '${data.kd_unit_kerja}' AND STATUS_SATKER = '1'`,
        { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
      );
      
      if (satkerData.length > 0) {
        enrichedData = {
          ...data.toJSON(),
          relasi_data: {
            kd_satker: satkerData[0].KDSATKER,
            nm_satker: satkerData[0].NMSATKER,
            nama_jabatan: satkerData[0].NAMA_JABATAN,
            jenis_jabatan: satkerData[0].JENIS_JABATAN,
            kdskpd: satkerData[0].KDSKPD
          }
        };
      } else {
        enrichedData = data.toJSON();
      }
    } else if (data.jenis === 'bidang_tbl') {
      // Ambil data dari bidang_tbl
      const bidangData = await ViewDaftarUnitKerja.sequelize.query(
        `SELECT BIDANGF, NMBIDANG FROM bidang_tbl WHERE BIDANGF = '${data.kd_unit_kerja}' AND STATUS_BIDANG = '1'`,
        { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
      );
      
      if (bidangData.length > 0) {
        enrichedData = {
          ...data.toJSON(),
          relasi_data: {
            bidangf: bidangData[0].BIDANGF,
            nm_bidang: bidangData[0].NMBIDANG
          }
        };
      } else {
        enrichedData = data.toJSON();
      }
    } else if (data.jenis === 'bidang_sub') {
      // Ambil data dari bidang_sub
      const subBidangData = await ViewDaftarUnitKerja.sequelize.query(
        `SELECT SUBF, NMSUB, BIDANGF FROM bidang_sub WHERE SUBF = '${data.kd_unit_kerja}' AND STATUS_SUB = '1'`,
        { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
      );
      
      if (subBidangData.length > 0) {
        enrichedData = {
          ...data.toJSON(),
          relasi_data: {
            subf: subBidangData[0].SUBF,
            nm_sub: subBidangData[0].NMSUB,
            bidangf: subBidangData[0].BIDANGF
          }
        };
      } else {
        enrichedData = data.toJSON();
      }
    } else {
      enrichedData = data.toJSON();
    }

    // Ambil data pegawai di unit kerja ini
    const pegawaiData = await ViewDaftarUnitKerja.sequelize.query(
      `SELECT 
        mp.NAMA,
        mp.NIP,
        mp.KDSKPD,
        mp.KDSATKER,
        mp.BIDANGF,
        mp.KDPANGKAT,
        mp.JENIS_JABATAN,
        mp.KDJENKEL,
        mp.TEMPATLHR,
        mp.TGLLHR,
        mp.AGAMA,
        mp.ALAMAT,
        mp.NOTELP,
        mp.NOKTP,
        mp.FOTO,
        mp.JENIS_PEGAWAI,
        mp.STATUSAKTIF,
        mp.NM_UNIT_KERJA,
        mp.KODE_UNIT_KERJA
      FROM mstpegawai mp
      WHERE mp.KODE_UNIT_KERJA = '${data.kd_unit_kerja}' 
        AND mp.STATUSAKTIF = 'AKTIF'
      ORDER BY mp.NAMA ASC`,
      { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
    );

    // Tambahkan data pegawai ke response
    enrichedData.pegawai = pegawaiData.map((pegawai, index) => ({
      id: index + 1, // Generate ID berdasarkan index
      username: pegawai.NIP, // Gunakan NIP sebagai username
      email: null, // Tidak ada email di mstpegawai
      level: null, // Tidak ada level di mstpegawai
      status: '10', // Default status
      nama: pegawai.NAMA,
      nip: pegawai.NIP,
      kdskpd: pegawai.KDSKPD,
      kdsatker: pegawai.KDSATKER,
      bidangf: pegawai.BIDANGF,
      kdpangkat: pegawai.KDPANGKAT,
      jenis_jabatan: pegawai.JENIS_JABATAN,
      kdjenkel: pegawai.KDJENKEL,
      tempatlhr: pegawai.TEMPATLHR,
      tgllhr: pegawai.TGLLHR,
      agama: pegawai.AGAMA,
      alamat: pegawai.ALAMAT,
      notelp: pegawai.NOTELP,
      noktp: pegawai.NOKTP,
      foto: pegawai.FOTO,
      jenis_pegawai: pegawai.JENIS_PEGAWAI,
      status_aktif: pegawai.STATUSAKTIF, // Field yang benar
      nm_unit_kerja: pegawai.NM_UNIT_KERJA,
      kd_unit_kerja: pegawai.KODE_UNIT_KERJA // Field yang benar
    }));

    res.json(enrichedData);

  } catch (error) {
    console.error('GetViewDaftarUnitKerjaById Error:', error);
    res.status(500).json({ error: error.message });
  }
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

    // Ambil semua kd_unit_atasan yang unik untuk batch query
    const uniqueSatkerCodes = [...new Set(data.map(item => item.kd_unit_atasan))];
    
    // Batch query untuk semua satker sekaligus
    let satkerMap = {};
    if (uniqueSatkerCodes.length > 0) {
      const satkerCodesStr = uniqueSatkerCodes.map(code => `'${code}'`).join(',');
      const satkerData = await ViewDaftarUnitKerja.sequelize.query(
        `SELECT KDSATKER, NMSATKER FROM satker_tbl WHERE KDSATKER IN (${satkerCodesStr}) AND STATUS_SATKER = '1'`,
        { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
      );
      
      // Buat map untuk lookup cepat
      satkerMap = satkerData.reduce((map, satker) => {
        map[satker.KDSATKER] = satker;
        return map;
      }, {});
    }

    // Transform data ke format yang diharapkan frontend
    const enrichedData = [];
    for (const item of data) {
      const satkerInfo = satkerMap[item.kd_unit_atasan] || null;

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

    // Ambil semua kd_unit_atasan yang unik untuk batch query bidang
    const uniqueBidangCodes = [...new Set(data.map(item => item.kd_unit_atasan))];
    
    // Batch query untuk semua bidang sekaligus
    let bidangMap = {};
    let satkerCodes = [];
    if (uniqueBidangCodes.length > 0) {
      const bidangCodesStr = uniqueBidangCodes.map(code => `'${code}'`).join(',');
      const bidangData = await ViewDaftarUnitKerja.sequelize.query(
        `SELECT BIDANGF, NMBIDANG, NAMA_JABATAN, JENIS_JABATAN, KDSATKER FROM bidang_tbl WHERE BIDANGF IN (${bidangCodesStr}) AND STATUS_BIDANG = '1'`,
        { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
      );
      
      // Buat map untuk lookup cepat dan kumpulkan kode satker
      bidangMap = bidangData.reduce((map, bidang) => {
        map[bidang.BIDANGF] = bidang;
        if (bidang.KDSATKER && !satkerCodes.includes(bidang.KDSATKER)) {
          satkerCodes.push(bidang.KDSATKER);
        }
        return map;
      }, {});
    }
    
    // Batch query untuk semua satker sekaligus
    let satkerMap = {};
    if (satkerCodes.length > 0) {
      const satkerCodesStr = satkerCodes.map(code => `'${code}'`).join(',');
      const satkerData = await ViewDaftarUnitKerja.sequelize.query(
        `SELECT KDSATKER, NMSATKER, NAMA_JABATAN, JENIS_JABATAN FROM satker_tbl WHERE KDSATKER IN (${satkerCodesStr}) AND STATUS_SATKER = '1'`,
        { type: ViewDaftarUnitKerja.sequelize.QueryTypes.SELECT }
      );
      
      // Buat map untuk lookup cepat
      satkerMap = satkerData.reduce((map, satker) => {
        map[satker.KDSATKER] = satker;
        return map;
      }, {});
    }

    // Transform data ke format yang diharapkan frontend
    const enrichedData = [];
    for (const item of data) {
      const bidangInfo = bidangMap[item.kd_unit_atasan] || null;
      const satkerInfo = bidangInfo ? satkerMap[bidangInfo.KDSATKER] || null : null;
      
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
  getLevel1DataNoView,
  getLevel2DataNoView,
  getLevel3DataNoView,
  getViewDaftarUnitKerjaById,
  getFilterOptionsHierarchy
};
