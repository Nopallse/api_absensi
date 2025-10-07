const { ViewDaftarUnitKerja, Lokasi } = require('../models');

/**
 * Mendapatkan lokasi efektif untuk unit kerja berdasarkan hierarki
 * @param {string} kd_unit_kerja - Kode unit kerja (format: level1/level2/level3)
 * @returns {Object|null} - Lokasi efektif atau null
 */
const getEffectiveLocation = async (kd_unit_kerja) => {
  try {
    if (!kd_unit_kerja) return null;
    console.log('kd_unit_kerja', kd_unit_kerja);
    const levels = kd_unit_kerja.split('/');
    const level = levels.length;

    // Cari lokasi spesifik untuk unit kerja ini
    let lokasi = await Lokasi.findOne({
      where: {
        kd_unit_kerja: kd_unit_kerja,
        status: true
      },
      order: [['is_inherited', 'ASC']] // Prioritaskan lokasi yang bukan inherited
    });

    if (lokasi) {
      return lokasi;
    }

    // Jika tidak ada lokasi spesifik, cari dari parent level
    for (let i = level - 1; i > 0; i--) {
      const parentKdUnitKerja = levels.slice(0, i).join('/');
      
      lokasi = await Lokasi.findOne({
        where: {
          kd_unit_kerja: parentKdUnitKerja,
          status: true
        },
        order: [['is_inherited', 'ASC']]
      });

      if (lokasi) {
        return lokasi;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting effective location:', error);
    return null;
  }
};

/**
 * Membuat atau mengupdate lokasi untuk unit kerja
 * @param {Object} lokasiData - Data lokasi
 * @param {string} createdBy - User yang membuat
 * @returns {Object} - Lokasi yang dibuat/diupdate
 */
const createOrUpdateLocation = async (lokasiData, createdBy) => {
  try {
    const { kd_unit_kerja, lat, lng, range, nama_lokasi, alamat, ket } = lokasiData;
    
    if (!kd_unit_kerja || !lat || !lng) {
      throw new Error('kd_unit_kerja, lat, dan lng harus diisi');
    }

    const levels = kd_unit_kerja.split('/');
    const level = levels.length;

    // Cari unit kerja di database
    const unitKerja = await ViewDaftarUnitKerja.findOne({
      where: { kd_unit_kerja: kd_unit_kerja }
    });

    if (!unitKerja) {
      throw new Error('Unit kerja tidak ditemukan');
    }

    // Cari lokasi existing
    let lokasi = await Lokasi.findOne({
      where: {
        kd_unit_kerja: kd_unit_kerja,
        is_inherited: false // Hanya lokasi yang bukan inherited
      }
    });

    const lokasiDataToSave = {
      id_unit_kerja: unitKerja.id_unit_kerja,
      kd_unit_kerja: kd_unit_kerja,
      level_unit_kerja: level,
      lat: lat,
      lng: lng,
      range: range || 100,
      nama_lokasi: nama_lokasi,
      alamat: alamat,
      ket: ket,
      is_inherited: false,
      status: true,
      created_by: createdBy,
      updated_by: createdBy
    };

    if (lokasi) {
      // Update existing
      await lokasi.update(lokasiDataToSave);
    } else {
      // Create new
      lokasi = await Lokasi.create(lokasiDataToSave);
    }

    // Update child locations jika ada
    await updateChildLocations(kd_unit_kerja, lokasi);

    return lokasi;
  } catch (error) {
    console.error('Error creating/updating location:', error);
    throw error;
  }
};

/**
 * Mengupdate lokasi child berdasarkan parent
 * @param {string} parentKdUnitKerja - Kode unit kerja parent
 * @param {Object} parentLokasi - Data lokasi parent
 */
const updateChildLocations = async (parentKdUnitKerja, parentLokasi) => {
  try {
    // Cari semua child unit kerja
    const childUnits = await ViewDaftarUnitKerja.findAll({
      where: {
        kd_unit_kerja: {
          [require('sequelize').Op.like]: `${parentKdUnitKerja}/%`
        },
        status: '1'
      }
    });

    for (const childUnit of childUnits) {
      // Cek apakah child sudah punya lokasi sendiri
      const existingChildLocation = await Lokasi.findOne({
        where: {
          kd_unit_kerja: childUnit.kd_unit_kerja,
          is_inherited: false
        }
      });

      if (!existingChildLocation) {
        // Buat lokasi inherited untuk child
        await Lokasi.create({
          id_unit_kerja: childUnit.id_unit_kerja,
          kd_unit_kerja: childUnit.kd_unit_kerja,
          level_unit_kerja: childUnit.kd_unit_kerja.split('/').length,
          parent_lokasi_id: parentLokasi.lokasi_id,
          lat: parentLokasi.lat,
          lng: parentLokasi.lng,
          range: parentLokasi.range,
          nama_lokasi: `${parentLokasi.nama_lokasi || 'Lokasi'} (Inherited)`,
          alamat: parentLokasi.alamat,
          ket: `Lokasi diwariskan dari ${parentKdUnitKerja}`,
          is_inherited: true,
          status: true,
          created_by: parentLokasi.created_by,
          updated_by: parentLokasi.updated_by
        });
      }
    }
  } catch (error) {
    console.error('Error updating child locations:', error);
  }
};

/**
 * Menghapus lokasi dan mengupdate child locations
 * @param {string} kd_unit_kerja - Kode unit kerja
 * @param {string} deletedBy - User yang menghapus
 */
const deleteLocation = async (kd_unit_kerja, deletedBy) => {
  try {
    // Hapus lokasi utama
    await Lokasi.update(
      { 
        status: false,
        updated_by: deletedBy
      },
      {
        where: {
          kd_unit_kerja: kd_unit_kerja,
          is_inherited: false
        }
      }
    );

    // Hapus semua child locations yang inherited
    await Lokasi.update(
      { 
        status: false,
        updated_by: deletedBy
      },
      {
        where: {
          kd_unit_kerja: {
            [require('sequelize').Op.like]: `${kd_unit_kerja}/%`
          },
          is_inherited: true
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
};

/**
 * Mendapatkan semua lokasi untuk hierarki unit kerja
 * @param {string} kd_unit_kerja - Kode unit kerja parent
 * @returns {Array} - Array lokasi dalam hierarki
 */
const getLocationHierarchy = async (kd_unit_kerja) => {
  try {
    const locations = await Lokasi.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { kd_unit_kerja: kd_unit_kerja },
          { kd_unit_kerja: { [require('sequelize').Op.like]: `${kd_unit_kerja}/%` } }
        ],
        status: true
      },
      include: [
        {
          model: ViewDaftarUnitKerja,
          as: 'unitKerja',
          attributes: ['nm_unit_kerja', 'jenis']
        }
      ],
      order: [
        ['level_unit_kerja', 'ASC'],
        ['is_inherited', 'ASC'],
        ['kd_unit_kerja', 'ASC']
      ]
    });

    return locations;
  } catch (error) {
    console.error('Error getting location hierarchy:', error);
    return [];
  }
};

module.exports = {
  getEffectiveLocation,
  createOrUpdateLocation,
  updateChildLocations,
  deleteLocation,
  getLocationHierarchy
};
