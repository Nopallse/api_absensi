"use strict";

const { User, MstPegawai, SkpdTbl, SatkerTbl, BidangTbl, AdmOpd, AdmUpt, ViewDaftarUnitKerja } = require("../models");
const Sequelize = require("sequelize");
const { Op } = Sequelize;

/**
 * Utility untuk menggabungkan data user dengan data master pegawai
 * Karena user dan mstpegawai berada di database berbeda
 */

/**
 * Mapping data user dengan data master pegawai berdasarkan username = NIP
 * @param {Array} users - Array data user
 * @param {Object} options - Opsi untuk include relasi
 * @returns {Array} Array data user yang sudah digabung dengan data master
 */
const mapUsersWithMasterData = async (users, options = {}) => {
  try {
    if (!users || users.length === 0) {
      return [];
    }

    // Ambil semua username dari data user
    const usernames = users.map(user => user.username);
    console.log('Usernames to search:', usernames);
    
    // Ambil data master pegawai berdasarkan NIP (username)
    const masterData = await MstPegawai.findAll({
      where: {
        NIP: usernames
      },
      include: [
        {
          model: ViewDaftarUnitKerja,
          as: 'unitKerja'
        }
      ],
      attributes: [
        'NIP', 'NAMA', 'KDSKPD', 'KDSATKER', 'BIDANGF', 'KODE_UNIT_KERJA','NM_UNIT_KERJA',
        'KDPANGKAT', 'JENIS_JABATAN', 'KDJENKEL', 'TEMPATLHR', 
        'TGLLHR', 'AGAMA', 'ALAMAT', 'NOTELP', 'NOKTP', 
        'EMAIL', 'FOTO', 'JENIS_PEGAWAI', 'STATUSAKTIF'
      ]
    });

    
    console.log('Master data found:', masterData.length);
    console.log('Sample master data:', masterData[0]?.toJSON());

    // Ambil data Satker dan Bidang secara terpisah
    const kdsatkerList = [...new Set(masterData.map(p => p.KDSATKER).filter(Boolean))];
    const bidangfList = [...new Set(masterData.map(p => p.BIDANGF).filter(Boolean))];

    // Ambil data Satker
    const satkerData = kdsatkerList.length > 0 ? await SatkerTbl.findAll({
      where: { KDSATKER: kdsatkerList },
      attributes: ['KDSATKER', 'NMSATKER']
    }) : [];

    // Ambil data Bidang
    const bidangData = bidangfList.length > 0 ? await BidangTbl.findAll({
      where: { BIDANGF: bidangfList },
      attributes: ['BIDANGF', 'NMBIDANG']
    }) : [];

    // Buat map untuk lookup cepat
    const satkerMap = new Map();
    satkerData.forEach(s => {
      satkerMap.set(s.KDSATKER, {
        kdsatker: s.KDSATKER,
        nmsatker: s.NMSATKER
      });
    });

    const bidangMap = new Map();
    bidangData.forEach(b => {
      bidangMap.set(b.BIDANGF, {
        bidangf: b.BIDANGF,
        nmbidang: b.NMBIDANG
      });
    });

    // Buat map untuk lookup cepat
    const masterDataMap = new Map();
    masterData.forEach(pegawai => {
      masterDataMap.set(pegawai.NIP, {
        // Data dasar pegawai
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
        email: pegawai.EMAIL,
        foto: pegawai.FOTO,
        jenis_pegawai: pegawai.JENIS_PEGAWAI,
        kd_unit_kerja: pegawai.KODE_UNIT_KERJA,
        nm_unit_kerja: pegawai.NM_UNIT_KERJA,
        status_aktif: pegawai.STATUSAKTIF,
        
        // Data relasi
        skpd: pegawai.SkpdTbl ? {
          kdskpd: pegawai.SkpdTbl.KDSKPD,
          nmskpd: pegawai.SkpdTbl.NMSKPD,
          status_skpd: pegawai.SkpdTbl.StatusSKPD
        } : null,
        
        satker: satkerMap.get(pegawai.KDSATKER) || null,
        bidang: bidangMap.get(pegawai.BIDANGF) || null,
      });
    });

    // Gabungkan data user dengan data master
    const usersWithMasterData = users.map(user => {
      const userData = user.toJSON ? user.toJSON() : user;
      const masterData = masterDataMap.get(user.username);
      
      // Exclude sensitive data
      delete userData.password_hash;
      delete userData.auth_key;
      
      if (masterData) {
        return {
          ...userData,
          // Override dengan data master yang lebih lengkap
          nama: masterData.nama,
          nip: masterData.nip,
          kdskpd: masterData.kdskpd,
          kdsatker: masterData.kdsatker,
          bidangf: masterData.bidangf,
          kd_unit_kerja: masterData.kd_unit_kerja,
          nm_unit_kerja: masterData.nm_unit_kerja,
          kdpangkat: masterData.kdpangkat,
          jenis_jabatan: masterData.jenis_jabatan,
          kdjenkel: masterData.kdjenkel,
          tempatlhr: masterData.tempatlhr,
          tgllhr: masterData.tgllhr,
          agama: masterData.agama,
          alamat: masterData.alamat,
          notelp: masterData.notelp,
          noktp: masterData.noktp,
          email: masterData.email,
          foto: masterData.foto,
          jenis_pegawai: masterData.jenis_pegawai,
          status_aktif: masterData.status_aktif,
          
          // Data relasi
          satker: masterData.satker,
          bidang: masterData.bidang,
          unitKerja: masterData.unitKerja
        };
      } else {
        // Jika tidak ada data master, tetap return data user dengan field kosong
        return {
          ...userData,
          nama: null,
          nip: user.username,
          kdskpd: null,
          kdsatker: null,
          bidangf: null,
          nm_unit_kerja: null,
          kdpangkat: null,
          jenis_jabatan: null,
          kdjenkel: null,
          tempatlhr: null,
          tgllhr: null,
          agama: null,
          alamat: null,
          notelp: null,
          noktp: null,
          email: null,
          foto: null,
          jenis_pegawai: null,
          status_aktif: "AKTIF",
          satker: null,
          bidang: null,
          unitKerja: null
        };
      }
    });

    return usersWithMasterData;
  } catch (error) {
    console.error('Error mapping users with master data:', error);
    throw error;
  }
};

/**
 * Mendapatkan data user dengan master data berdasarkan ID user
 * @param {Number} userId - ID user
 * @param {Object} options - Opsi untuk include relasi
 * @returns {Object|null} Data user yang sudah digabung dengan data master
 */
const getUserWithMasterData = async (userId, options = {}) => {
  try {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: AdmOpd,
          attributes: [ 'id_satker', 'id_bidang', 'kategori'],
          required: false
        },
        {
          model: AdmUpt,
          attributes: [ 'id_satker', 'id_bidang', 'kategori', 'umum'],
          required: false
        }
      ]
    });

    if (!user) {
      return null;
    }

    // Ambil data master pegawai berdasarkan NIP (username)
    const masterData = await MstPegawai.findOne({
      where: { NIP: user.username },
      include: [
        {
          model: ViewDaftarUnitKerja,
          as: 'unitKerja'
        }
      ],
      attributes: [
        'NIP', 'NAMA', 'KDSKPD', 'KDSATKER', 'BIDANGF', 'NM_UNIT_KERJA',
        'KDPANGKAT', 'JENIS_JABATAN', 'KDJENKEL', 'TEMPATLHR', 
        'TGLLHR', 'AGAMA', 'ALAMAT', 'NOTELP', 'NOKTP', 
        'EMAIL', 'FOTO', 'JENIS_PEGAWAI', 'STATUSAKTIF'
      ]
    });

    // Ambil data Satker dan Bidang secara terpisah jika ada masterData
    let satkerData = null;
    let bidangData = null;

    if (masterData && masterData.KDSATKER) {
      satkerData = await SatkerTbl.findOne({
        where: { KDSATKER: masterData.KDSATKER },
        attributes: ['KDSATKER', 'NMSATKER']
      });
    }

    if (masterData && masterData.BIDANGF) {
      bidangData = await BidangTbl.findOne({
        where: { BIDANGF: masterData.BIDANGF },
        attributes: ['BIDANGF', 'NMBIDANG']
      });
    }

    const userData = user.toJSON();
    
    // Exclude sensitive data
    delete userData.password_hash;
    delete userData.auth_key;
    
    if (masterData) {
      return {
        ...userData,
        // Data master pegawai
        nama: masterData.NAMA,
        nip: masterData.NIP,
        // kdskpd: masterData.KDSKPD,
        nm_unit_kerja: masterData.NM_UNIT_KERJA,
        kdsatker: masterData.KDSATKER,
        bidangf: masterData.BIDANGF,
        kdpangkat: masterData.KDPANGKAT,
        jenis_jabatan: masterData.JENIS_JABATAN,
        kdjenkel: masterData.KDJENKEL,
        tempatlhr: masterData.TEMPATLHR,
        tgllhr: masterData.TGLLHR,
        agama: masterData.AGAMA,
        alamat: masterData.ALAMAT,
        notelp: masterData.NOTELP,
        noktp: masterData.NOKTP,
        email: masterData.EMAIL,
        foto: masterData.FOTO,
        jenis_pegawai: masterData.JENIS_PEGAWAI,
        status_aktif: masterData.STATUSAKTIF,
        
        // Data relasi
        // skpd: masterData.SkpdTbl ? {
        //   kdskpd: masterData.SkpdTbl.KDSKPD,
        //   nmskpd: masterData.SkpdTbl.NMSKPD,
        //   status_skpd: masterData.SkpdTbl.StatusSKPD
        // } : null,
        
        satker: satkerData ? {
          kdsatker: satkerData.KDSATKER,
          nmsatker: satkerData.NMSATKER
        } : null,
        
        bidang: bidangData ? {
          bidangf: bidangData.BIDANGF,
          nmbidang: bidangData.NMBIDANG
        } : null,
        
        // Data unit kerja dari relasi ViewDaftarUnitKerja
        unitKerja: masterData.unitKerja ? {
          kd_unit_kerja: masterData.unitKerja.kd_unit_kerja,
          nm_unit_kerja: masterData.unitKerja.nm_unit_kerja,
          jenis: masterData.unitKerja.jenis,
          status: masterData.unitKerja.status
        } : null
      };
    }

    // Jika tidak ada data master, tambahkan default status_aktif
    if (!masterData) {
      userData.status_aktif = "AKTIF";
    }

    return userData;
  } catch (error) {
    console.error('Error getting user with master data:', error);
    throw error;
  }
};

/**
 * Mendapatkan id_skpd berdasarkan level user dan data admin
 * @param {Object} user - Data user dengan relasi AdmOpd/AdmUpt
 * @param {String} userLevel - Level user ('1', '2', '3')
 * @returns {String|null} ID SKPD
 */
const getSkpdIdByUserLevel = (user, userLevel) => {
  try {
    if (userLevel === '2' && user.AdmOpd) {
      return user.AdmOpd.id_skpd;
    } else if (userLevel === '3' && user.AdmUpt) {
      return user.AdmUpt.id_skpd;
    }
    return null;
  } catch (error) {
    console.error('Error getting SKPD ID by user level:', error);
    return null;
  }
};

/**
 * Filter users berdasarkan SKPD
 * @param {Array} users - Array data user
 * @param {String} id_skpd - ID SKPD untuk filter
 * @returns {Array} Array data user yang sudah difilter
 */
const filterUsersBySkpd = (users, id_skpd) => {
  if (!id_skpd) {
    return users;
  }
  
  return users.filter(user => user.kdskpd === id_skpd);
};

/**
 * Search users dengan master data
 * @param {String} query - Query pencarian
 * @param {String} id_skpd - ID SKPD untuk filter (optional)
 * @param {Object} options - Opsi tambahan termasuk status
 * @returns {Array} Array data user yang sudah digabung dengan data master
 */
const searchUsersWithMasterData = async (query, id_skpd = null, options = {}) => {
  try {
    // Jika ada filter SKPD, ambil NIP yang valid terlebih dahulu
    let validNips = null;
    if (id_skpd) {
      const pegawaiWithSkpd = await MstPegawai.findAll({
        where: { KDSKPD: id_skpd },
        attributes: ['NIP']
      });
      validNips = pegawaiWithSkpd.map(p => p.NIP);
      
      if (validNips.length === 0) {
        return []; // Tidak ada data, return empty array
      }
    }

    // Search di master data berdasarkan nama atau NIP
    let masterSearchCondition = {
      [Op.or]: [
        { NIP: { [Op.like]: `%${query}%` } },
        { NAMA: { [Op.like]: `%${query}%` } }
      ]
    };

    // Jika ada filter SKPD, tambahkan ke kondisi
    if (id_skpd) {
      masterSearchCondition = {
        [Op.and]: [
          masterSearchCondition,
          { KDSKPD: id_skpd }
        ]
      };
    }

    // Cari di master data pegawai berdasarkan nama atau NIP
    const masterResults = await MstPegawai.findAll({
      where: masterSearchCondition,
      attributes: ['NIP'],
      limit: options.limit || 50,
      offset: options.offset || 0
    });

    const foundNips = masterResults.map(p => p.NIP);

    if (foundNips.length === 0) {
      return []; // Tidak ada data ditemukan
    }

    // Buat kondisi untuk User table
    let userWhere = {
      username: {
        [Op.in]: foundNips
      }
    };

    // Tambahkan filter status jika ada
    if (options.status !== undefined) {
      userWhere.status = options.status;
    }

    // Ambil data user berdasarkan NIP yang ditemukan
    const users = await User.findAll({
      where: userWhere,
      attributes: { exclude: ["password_hash"] },
      order: options.order || [['id', 'DESC']]
    });

    // Map dengan data master
    const usersWithMasterData = await mapUsersWithMasterData(users, options);

    return usersWithMasterData;
  } catch (error) {
    console.error('Error searching users with master data:', error);
    throw error;
  }
};

module.exports = {
  mapUsersWithMasterData,
  getUserWithMasterData,
  getSkpdIdByUserLevel,
  filterUsersBySkpd,
  searchUsersWithMasterData
};
