"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ViewDaftarUnitKerja extends Model {
    static associate(models) {
      // Relasi dengan mstpegawai berdasarkan nm_unit_kerja
      ViewDaftarUnitKerja.hasMany(models.MstPegawai, {
        foreignKey: 'NM_UNIT_KERJA',
        sourceKey: 'nm_unit_kerja',
        as: 'pegawai'
      });

      // Relasi dengan satker_tbl berdasarkan kd_unit_kerja
      ViewDaftarUnitKerja.belongsTo(models.SatkerTbl, {
        foreignKey: 'kd_unit_kerja',
        targetKey: 'KDSATKER',
        as: 'satker'
      });

      // Relasi dengan bidang_tbl berdasarkan kd_unit_kerja
      ViewDaftarUnitKerja.belongsTo(models.BidangTbl, {
        foreignKey: 'kd_unit_kerja',
        targetKey: 'BIDANGF',
        as: 'bidang'
      });

      // Relasi dengan bidang_sub berdasarkan kd_unit_kerja = SUBF
      ViewDaftarUnitKerja.belongsTo(models.BidangSub, {
        foreignKey: 'kd_unit_kerja',
        targetKey: 'SUBF',
        as: 'bidangSub'
      });

      // Relasi tambahan untuk mendapatkan data satker dari bidang
      ViewDaftarUnitKerja.belongsTo(models.SatkerTbl, {
        foreignKey: 'kd_unit_atasan',
        targetKey: 'KDSATKER',
        as: 'satkerInduk'
      });
    }
  }

  ViewDaftarUnitKerja.init(
    {
      id_unit_kerja: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'id_unit_kerja'
      },
      kd_unit_kerja: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: true,
        field: 'kd_unit_kerja'
      },
      nm_unit_kerja: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'nm_unit_kerja'
      },
      jenis: {
        type: DataTypes.ENUM('satker_tbl', 'bidang_tbl', 'bidang_sub'),
        allowNull: true,
        field: 'jenis'
      },
      status: {
        type: DataTypes.CHAR(1),
        allowNull: true,
        field: 'status'
      },
      kd_unit_atasan: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'kd_unit_atasan'
      }
    },
    {
      sequelize,
      modelName: "ViewDaftarUnitKerja",
      tableName: "view_daftar_unit_kerja",
      timestamps: false,
      freezeTableName: true,
      // Tidak perlu sync karena ini adalah VIEW yang sudah ada
      sync: false,
      // Mencegah Sequelize membuat kolom id otomatis
      id: false
    }
  );

  return ViewDaftarUnitKerja;
};
