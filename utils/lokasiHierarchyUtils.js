const { Lokasi, SatkerTbl, BidangTbl, BidangSub } = require('../models');


/**
 * Mendapatkan lokasi efektif berdasarkan hierarki (OPTIMIZED)
 * Prioritas: Sub Bidang > Bidang > Satker
 */
const getEffectiveLocation = async (idSatker, idBidang = null, idSubBidang = null) => {
  try {
   

    let whereConditions = [];
    const usedConditions = [];

    if (idBidang == null && idSubBidang == null) {
        // Hanya cari lokasi di level satker (termasuk yang status false)
      whereConditions.push({
        id_satker: idSatker,
        id_bidang: null,
        id_sub_bidang: null
      });
      usedConditions.push('satker');
    } else {
      // Tambahkan kondisi sub_bidang jika ada (hanya yang status true)
      if (idSubBidang && idBidang) {
        whereConditions.push({
          id_satker: idSatker,
          id_bidang: idBidang,
          id_sub_bidang: idSubBidang,
          status: true
        });
        usedConditions.push('sub_bidang');
      }
      // Tambahkan kondisi bidang jika ada (hanya yang status true)
      if (idBidang) {
        whereConditions.push({
          id_satker: idSatker,
          id_bidang: idBidang,
          id_sub_bidang: null,
          status: true
        });
        usedConditions.push('bidang');
      }
      // Selalu tambahkan kondisi satker sebagai fallback (hanya yang status true)
      whereConditions.push({
        id_satker: idSatker,
        id_bidang: null,
        id_sub_bidang: null,
        status: true
      });
      usedConditions.push('satker');
    }

    console.log('[getEffectiveLocation] Kondisi lokasi yang dicek:', usedConditions);

    // Query dengan OR condition dan order by prioritas
    const locations = await Lokasi.findAll({
      where: {
        [require('sequelize').Op.or]: whereConditions
      },
      order: [
        // Prioritas: sub_bidang > bidang > satker
        [require('sequelize').literal('CASE WHEN id_sub_bidang IS NOT NULL THEN 1 WHEN id_bidang IS NOT NULL THEN 2 ELSE 3 END'), 'ASC']
      ],
      limit: 1
    });

    if (locations.length > 0) {
      const location = locations[0];
      let level, source;

      if (location.id_sub_bidang) {
        level = 'sub_bidang';
        source = 'sub_bidang';
      } else if (location.id_bidang) {
        level = 'bidang';
        source = 'bidang';
      } else {
        level = 'satker';
        source = 'satker';
      }
      console.log('lokasi', location.toJSON());
      console.log('level', level);
      console.log('source', source);

      return {
        ...location.toJSON(),
        level,
        source
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting effective location:', error);
    throw error;
  }
};

/**
 * Membuat atau memperbarui lokasi berdasarkan level
 */
const createOrUpdateLocation = async (locationData) => {
  try {
    const { idSatker, idBidang, idSubBidang, lat, lng, range, ket, status = true } = locationData;

    // Validasi: id_satker wajib diisi
    if (!idSatker) {
      throw new Error('ID Satker wajib diisi');
    }

    // Cari lokasi yang sudah ada
    const existingLocation = await Lokasi.findOne({
      where: {
        id_satker: idSatker,
        id_bidang: idBidang || null,
        id_sub_bidang: idSubBidang || null
      }
    });

    // Tentukan id_unit_kerja berdasarkan level
    let idUnitKerja;
    if (idSubBidang) {
      idUnitKerja = idSubBidang; // Level 3
    } else if (idBidang) {
      idUnitKerja = idBidang; // Level 2
    } else {
      idUnitKerja = idSatker; // Level 1
    }

    // Tentukan kd_unit_kerja berdasarkan level
    let kdUnitKerja;
    if (idSubBidang) {
      kdUnitKerja = `${idSatker}/${idBidang}/${idSubBidang}`; // Level 3
    } else if (idBidang) {
      kdUnitKerja = `${idSatker}/${idBidang}`; // Level 2
    } else {
      kdUnitKerja = idSatker; // Level 1
    }

    // Tentukan level_unit_kerja
    let levelUnitKerja;
    if (idSubBidang) {
      levelUnitKerja = 3; // Level 3
    } else if (idBidang) {
      levelUnitKerja = 2; // Level 2
    } else {
      levelUnitKerja = 1; // Level 1
    }

    const locationPayload = {
      id_unit_kerja: idUnitKerja,
      kd_unit_kerja: kdUnitKerja,
      level_unit_kerja: levelUnitKerja,
      id_satker: idSatker,
      id_bidang: idBidang || null,
      id_sub_bidang: idSubBidang || null,
      lat,
      lng,
      range: range || 100,
      ket,
      status
    };

    if (existingLocation) {
      // Update lokasi yang sudah ada
      await existingLocation.update(locationPayload);
      return existingLocation;
    } else {
      // Buat lokasi baru
      const newLocation = await Lokasi.create(locationPayload);
      return newLocation;
    }
  } catch (error) {
    console.error('Error creating/updating location:', error);
    throw error;
  }
};

/**
 * Mendapatkan semua lokasi untuk satker tertentu
 */
const getLocationsBySatker = async (idSatker) => {
  try {
    const locations = await Lokasi.findAll({
      where: {
        id_satker: idSatker,
        status: true
      },
      include: [
        { model: SatkerTbl, as: 'satker' },
        { model: BidangTbl, as: 'bidang' },
        { model: BidangSub, as: 'subBidang' }
      ],
      order: [
        ['id_bidang', 'ASC'],
        ['id_sub_bidang', 'ASC']
      ]
    });

    return locations;
  } catch (error) {
    console.error('Error getting locations by satker:', error);
    throw error;
  }
};

/**
 * Mendapatkan hierarki lokasi untuk visualisasi
 */
const getLocationHierarchy = async (idSatker) => {
  try {
    const satker = await SatkerTbl.findByPk(idSatker);
    if (!satker) {
      throw new Error('Satker tidak ditemukan');
    }

    // Ambil semua bidang di satker ini
    const bidangList = await BidangTbl.findAll({
      where: {
        KDSATKER: idSatker,
        STATUS_BIDANG: '1'
      },
      order: [['NMBIDANG', 'ASC']]
    });

    const hierarchy = {
      satker: {
        ...satker.toJSON(),
        lokasi: null
      },
      bidang: []
    };

    // Cari lokasi satker
    const satkerLocation = await Lokasi.findOne({
      where: {
        id_satker: idSatker,
        id_bidang: null,
        id_sub_bidang: null,
        status: true
      }
    });

    if (satkerLocation) {
      hierarchy.satker.lokasi = satkerLocation.toJSON();
    }

    // Cari lokasi untuk setiap bidang
    for (const bidang of bidangList) {
      const bidangData = {
        ...bidang.toJSON(),
        lokasi: null,
        subBidang: []
      };

      // Cari lokasi bidang
      const bidangLocation = await Lokasi.findOne({
        where: {
          id_satker: idSatker,
          id_bidang: bidang.BIDANGF,
          id_sub_bidang: null,
          status: true
        }
      });

      if (bidangLocation) {
        bidangData.lokasi = bidangLocation.toJSON();
      }

      // Ambil sub-bidang dan lokasinya
      const subBidangList = await BidangSub.findAll({
        where: {
          BIDANGF: bidang.BIDANGF,
          STATUS_SUB: '1'
        },
        order: [['NMSUB', 'ASC']]
      });

      for (const subBidang of subBidangList) {
        const subBidangData = {
          ...subBidang.toJSON(),
          lokasi: null
        };

        // Cari lokasi sub-bidang
        const subBidangLocation = await Lokasi.findOne({
          where: {
            id_satker: idSatker,
            id_bidang: bidang.BIDANGF,
            id_sub_bidang: subBidang.SUBF,
            status: true
          }
        });

        if (subBidangLocation) {
          subBidangData.lokasi = subBidangLocation.toJSON();
        }

        bidangData.subBidang.push(subBidangData);
      }

      hierarchy.bidang.push(bidangData);
    }

    return hierarchy;
  } catch (error) {
    console.error('Error getting location hierarchy:', error);
    throw error;
  }
};

module.exports = {
  getEffectiveLocation,
  createOrUpdateLocation,
  getLocationsBySatker,
  getLocationHierarchy
};
