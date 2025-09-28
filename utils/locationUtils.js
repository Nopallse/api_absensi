"use strict";

const { Lokasi } = require("../models");
const { Op } = require("sequelize");

/**
 * Utility untuk operasi lokasi
 * Berisi fungsi-fungsi helper untuk mencari lokasi berdasarkan data pegawai/user
 */

/**
 * Mencari lokasi berdasarkan data user/pegawai dengan hierarki prioritas
 * Prioritas: Bidang > Satker > SKPD
 * @param {Object} userData - Data user yang berisi kdskpd, kdsatker, bidangf
 * @param {Object} options - Opsi tambahan untuk query
 * @returns {Object|null} Data lokasi yang ditemukan
 */
const getLokasiByUserData = async (userData, options = {}) => {
  try {
    if (!userData) {
      return null;
    }

    let lokasi = null;
    let lokasiLevel = null;
    console.log(userData.bidangf);
    console.log(userData.kdsatker);
    console.log(userData.kdskpd);

    // Prioritas 1: Cari berdasarkan Bidang
    if (userData.bidangf) {
      lokasi = await Lokasi.findOne({
        where: {
          id_bidang: userData.bidangf,
          status: true,
          ...options.where
        },
        ...options
      });
      if (lokasi) {
        lokasiLevel = 'bidang';
        console.log('Lokasi ditemukan di prioritas 1 (Bidang)');
      }
    }

    // Prioritas 2: Jika tidak ada lokasi bidang dan user tidak punya bidang, cari berdasarkan Satker
    if (!lokasi && userData.kdsatker && userData.bidangf) {
      lokasi = await Lokasi.findOne({
        where: {
          id_satker: userData.kdsatker,
          status: true,
          ...options.where
        },
        ...options
      });
      if (lokasi) {
        lokasiLevel = 'satker';
        console.log('Lokasi ditemukan di prioritas 2 (Satker)');
      }
    }

    // Prioritas 3: Jika tidak ada lokasi satker, cari berdasarkan SKPD
    if (!lokasi && userData.kdskpd) {
      lokasi = await Lokasi.findAll({
        where: {
          id_skpd: userData.kdskpd,
          status: true,
          ...options.where
        },
        ...options
      });
      if (lokasi) {
        lokasiLevel = 'skpd';
        console.log('Lokasi ditemukan di prioritas 3 (SKPD)');
      }
    }
    console.log(lokasi);

    // Return lokasi with level information
    if (lokasi) {
      // If lokasi is an array (from SKPD search), add level to each item
      if (Array.isArray(lokasi)) {
        return {
          data: lokasi,
          level: lokasiLevel,
        };
      } else {
        // If lokasi is a single object, add level property
        return {
          data: lokasi,
          level: lokasiLevel,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting lokasi by user data:', error);
    return null;
  }
};

module.exports = {
  getLokasiByUserData
};