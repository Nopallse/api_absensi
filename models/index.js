'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const { mainSequelize, masterSequelize } = require('../config/database.js');
const db = {};

// Load semua model yang ada dari database utama
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1 &&
      file !== 'mstpegawai.js' && // Exclude master models
      file !== 'skpd_tbl.js' &&    // Exclude master models
      file !== 'satker_tbl.js' &&  // Exclude master models
      file !== 'bidang_tbl.js' &&  // Exclude master models
      file !== 'view_daftar_unit_kerja.js' && // Exclude master models
      file !== 'bidang_sub.js'     // Exclude master models
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(mainSequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Load model master dari database master
const mstPegawaiModel = require('./mstpegawai.js')(masterSequelize, Sequelize.DataTypes);
db[mstPegawaiModel.name] = mstPegawaiModel;

const satkerTblModel = require('./satker_tbl.js')(masterSequelize, Sequelize.DataTypes);
db[satkerTblModel.name] = satkerTblModel;

const bidangTblModel = require('./bidang_tbl.js')(masterSequelize, Sequelize.DataTypes);
db[bidangTblModel.name] = bidangTblModel;

const viewDaftarUnitKerjaModel = require('./view_daftar_unit_kerja.js')(masterSequelize, Sequelize.DataTypes);
db[viewDaftarUnitKerjaModel.name] = viewDaftarUnitKerjaModel;

const bidangSubModel = require('./bidang_sub.js')(masterSequelize, Sequelize.DataTypes);
db[bidangSubModel.name] = bidangSubModel;

// Load model jadwal kegiatan dari database utama
const masterJadwalKegiatanModel = require('./masterJadwalKegiatan.js')(mainSequelize, Sequelize.DataTypes);
db[masterJadwalKegiatanModel.name] = masterJadwalKegiatanModel;

// Load model relasi jadwal kegiatan lokasi SKPD
const jadwalKegiatanLokasiSkpdModel = require('./jadwalKegiatanLokasiSatker.js')(mainSequelize, Sequelize.DataTypes);
db[jadwalKegiatanLokasiSkpdModel.name] = jadwalKegiatanLokasiSkpdModel;

// Load model admin log
const adminLogModel = require('./adminLog.js')(mainSequelize, Sequelize.DataTypes);
db[adminLogModel.name] = adminLogModel;

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = mainSequelize;
db.masterSequelize = masterSequelize;
db.Sequelize = Sequelize;

module.exports = db;