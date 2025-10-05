"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BidangSub extends Model {
    static associate(models) {
      // Relasi dengan bidang_tbl berdasarkan BIDANGF
      BidangSub.belongsTo(models.BidangTbl, {
        foreignKey: 'BIDANGF',
        targetKey: 'BIDANGF',
        as: 'bidang'
      });

      // Relasi dengan ViewDaftarUnitKerja (One to Many)
      BidangSub.hasMany(models.ViewDaftarUnitKerja, {
        foreignKey: 'kd_unit_kerja',
        sourceKey: 'SUBF',
        as: 'viewUnitKerja'
      });
    }
  }

  BidangSub.init(
    {
      SUBF: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: true,
        field: 'SUBF'
      },
      NMSUB: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NMSUB'
      },
      NAMA_JABATAN: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NAMA_JABATAN'
      },
      BIDANGF: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'BIDANGF'
      },
      STATUS_SUB: {
        type: DataTypes.CHAR(1),
        allowNull: true,
        field: 'STATUS_SUB'
      }
    },
    {
      sequelize,
      modelName: "BidangSub",
      tableName: "bidang_sub",
      timestamps: false,
      freezeTableName: true,
      // Tidak perlu sync karena tabel sudah ada
      sync: false,
      // Mencegah Sequelize membuat kolom id otomatis
      id: false
    }
  );

  return BidangSub;
};
