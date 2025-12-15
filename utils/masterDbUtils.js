"use strict";

const { MstPegawai, SkpdTbl, SatkerTbl, BidangTbl, Jabatan } = require("../models");
const Sequelize = require("sequelize");
const { Op } = Sequelize;

/**
 * Utility untuk operasi database master
 * Berisi fungsi-fungsi helper untuk mengakses data master
 */

/**
 * Mendapatkan data SKPD berdasarkan kode SKPD
 * @param {String} kdskpd - Kode SKPD
 * @returns {Object|null} Data SKPD
 */
const getSkpdByCode = async (kdskpd) => {
  try {
    const skpd = await SkpdTbl.findByPk(kdskpd, {
      attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD']
    });
    return skpd;
  } catch (error) {
    console.error('Error getting SKPD by code:', error);
    return null;
  }
};

/**
 * Mendapatkan data Satker berdasarkan kode Satker
 * @param {String} kdsatker - Kode Satker
 * @returns {Object|null} Data Satker
 */
const getSatkerByCode = async (kdsatker) => {
  try {
    const satker = await SatkerTbl.findByPk(kdsatker, {
      attributes: ['KDSATKER', 'NMSATKER', 'KDSKPD']
    });
    return satker;
  } catch (error) {
    console.error('Error getting Satker by code:', error);
    return null;
  }
};

/**
 * Mendapatkan data Bidang berdasarkan kode Bidang
 * @param {String} bidangf - Kode Bidang
 * @returns {Object|null} Data Bidang
 */
const getBidangByCode = async (bidangf) => {
  try {
    const bidang = await BidangTbl.findByPk(bidangf, {
      attributes: ['BIDANGF', 'NMBIDANG', 'KDSATKER']
    });
    return bidang;
  } catch (error) {
    console.error('Error getting Bidang by code:', error);
    return null;
  }
};

/**
 * Mendapatkan data pegawai berdasarkan NIP
 * @param {String} nip - NIP pegawai
 * @returns {Object|null} Data pegawai dengan relasi
 */
const getPegawaiByNip = async (nip) => {
  try {
    const pegawai = await MstPegawai.findOne({
      where: { NIP: nip },
      attributes: [
        'NIP', 'NAMA', 'KDSKPD', 'KDSATKER', 'BIDANGF', 'SUBF',
        'KDPANGKAT', 'JENIS_JABATAN', 'KDJENKEL', 'TEMPATLHR', 
        'TGLLHR', 'AGAMA', 'ALAMAT', 'NOTELP', 'NOKTP', 
        'EMAIL', 'FOTO', 'JENIS_PEGAWAI', 'STATUSAKTIF', 'NM_UNIT_KERJA'
      ],
      // include: [{
      //   model: Jabatan,
      //   as: 'jabatan',
      //   attributes: ['nama_jabatan']
      // }]
    });
    return pegawai;
  } catch (error) {
    console.error('Error getting pegawai by NIP:', error);
    return null;
  }
};

/**
 * Mendapatkan semua SKPD
 * @param {Object} options - Opsi query
 * @returns {Array} Array data SKPD
 */
const getAllSkpd = async (options = {}) => {
  try {
    const skpdList = await SkpdTbl.findAll({
      where: options.where || {},
      attributes: options.attributes || ['KDSKPD', 'NMSKPD', 'StatusSKPD'],
      order: options.order || [['NMSKPD', 'ASC']],
      limit: options.limit,
      offset: options.offset
    });
    return skpdList;
  } catch (error) {
    console.error('Error getting all SKPD:', error);
    return [];
  }
};

/**
 * Mendapatkan semua Satker berdasarkan SKPD
 * @param {String} kdskpd - Kode SKPD
 * @param {Object} options - Opsi query
 * @returns {Array} Array data Satker
 */
const getSatkerBySkpd = async (kdskpd, options = {}) => {
  try {
    const satkerList = await SatkerTbl.findAll({
      where: {
        KDSKPD: kdskpd,
        ...options.where
      },
      attributes: options.attributes || ['KDSATKER', 'NMSATKER', 'KDSKPD'],
      order: options.order || [['NMSATKER', 'ASC']],
      limit: options.limit,
      offset: options.offset
    });
    return satkerList;
  } catch (error) {
    console.error('Error getting Satker by SKPD:', error);
    return [];
  }
};

/**
 * Mendapatkan semua Bidang berdasarkan Satker
 * @param {String} kdsatker - Kode Satker
 * @param {Object} options - Opsi query
 * @returns {Array} Array data Bidang
 */
const getBidangBySatker = async (kdsatker, options = {}) => {
  try {
    const bidangList = await BidangTbl.findAll({
      where: {
        KDSATKER: kdsatker,
        ...options.where
      },
      attributes: options.attributes || ['BIDANGF', 'NMBIDANG', 'KDSATKER'],
      order: options.order || [['NMBIDANG', 'ASC']],
      limit: options.limit,
      offset: options.offset
    });
    return bidangList;
  } catch (error) {
    console.error('Error getting Bidang by Satker:', error);
    return [];
  }
};

/**
 * Mendapatkan data pegawai berdasarkan SKPD
 * @param {String} kdskpd - Kode SKPD
 * @param {Object} options - Opsi query
 * @returns {Array} Array data pegawai
 */
const getPegawaiBySkpd = async (kdskpd, options = {}) => {
  try {
    const pegawaiList = await MstPegawai.findAll({
      where: {
        KDSKPD: kdskpd,
        ...options.where
      },
      include: [
        {
          model: SkpdTbl,
          attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD'],
          required: false
        }
      ],
      attributes: options.attributes || [
        'NIP', 'NAMA', 'KDSKPD', 'KDSATKER', 'BIDANGF', 'SUBF',
        'KDPANGKAT', 'JENIS_JABATAN', 'KDJENKEL', 'TEMPATLHR', 
        'TGLLHR', 'AGAMA', 'ALAMAT', 'NOTELP', 'NOKTP', 
        'EMAIL', 'FOTO', 'JENIS_PEGAWAI', 'STATUSAKTIF', 'NM_UNIT_KERJA'
      ],
      order: options.order || [['NAMA', 'ASC']],
      limit: options.limit,
      offset: options.offset
    });
    return pegawaiList;
  } catch (error) {
    console.error('Error getting pegawai by SKPD:', error);
    return [];
  }
};

/**
 * Search pegawai berdasarkan nama atau NIP
 * @param {String} query - Query pencarian
 * @param {String} kdskpd - Kode SKPD untuk filter (optional)
 * @param {Object} options - Opsi query
 * @returns {Array} Array data pegawai
 */
const searchPegawai = async (query, kdskpd = null, options = {}) => {
  try {
    const whereCondition = {
      [Op.or]: [
        { NIP: { [Op.like]: `%${query}%` } },
        { NAMA: { [Op.like]: `%${query}%` } }
      ]
    };

    if (kdskpd) {
      whereCondition.KDSKPD = kdskpd;
    }

    const pegawaiList = await MstPegawai.findAll({
      where: whereCondition,
      include: [
        {
          model: SkpdTbl,
          attributes: ['KDSKPD', 'NMSKPD', 'StatusSKPD'],
          required: false
        }
      ],
      attributes: options.attributes || [
        'NIP', 'NAMA', 'KDSKPD', 'KDSATKER', 'BIDANGF', 'SUBF',
        'KDPANGKAT', 'JENIS_JABATAN', 'KDJENKEL', 'TEMPATLHR', 
        'TGLLHR', 'AGAMA', 'ALAMAT', 'NOTELP', 'NOKTP', 
        'EMAIL', 'FOTO', 'JENIS_PEGAWAI', 'STATUSAKTIF', 'NM_UNIT_KERJA'
      ],
      order: options.order || [['NAMA', 'ASC']],
      limit: options.limit || 50,
      offset: options.offset || 0
    });
    return pegawaiList;
  } catch (error) {
    console.error('Error searching pegawai:', error);
    return [];
  }
};

/**
 * Mendapatkan statistik pegawai berdasarkan SKPD
 * @param {String} kdskpd - Kode SKPD
 * @returns {Object} Statistik pegawai
 */
const getPegawaiStatsBySkpd = async (kdskpd) => {
  try {
    const totalPegawai = await MstPegawai.count({
      where: { KDSKPD: kdskpd }
    });

    const pegawaiByJenis = await MstPegawai.findAll({
      where: { KDSKPD: kdskpd },
      attributes: [
        'JENIS_PEGAWAI',
        [Sequelize.fn('COUNT', Sequelize.col('NIP')), 'count']
      ],
      group: ['JENIS_PEGAWAI']
    });

    const pegawaiByStatus = await MstPegawai.findAll({
      where: { KDSKPD: kdskpd },
      attributes: [
        'STATUSAKTIF',
        [Sequelize.fn('COUNT', Sequelize.col('NIP')), 'count']
      ],
      group: ['STATUSAKTIF']
    });

    return {
      total: totalPegawai,
      byJenis: pegawaiByJenis,
      byStatus: pegawaiByStatus
    };
  } catch (error) {
    console.error('Error getting pegawai stats by SKPD:', error);
    return {
      total: 0,
      byJenis: [],
      byStatus: []
    };
  }
};

module.exports = {
  getSkpdByCode,
  getSatkerByCode,
  getBidangByCode,
  getPegawaiByNip,
  getAllSkpd,
  getSatkerBySkpd,
  getBidangBySatker,
  getPegawaiBySkpd,
  searchPegawai,
  getPegawaiStatsBySkpd
};
