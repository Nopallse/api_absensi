"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SatkerTbl extends Model {
    static associate(models) {
      // Relasi dengan SKPD (Many to One)
      SatkerTbl.belongsTo(models.SkpdTbl, {
        foreignKey: 'KDSKPD',
        targetKey: 'KDSKPD'
      });

      // Relasi dengan Bidang (One to Many)
      SatkerTbl.hasMany(models.BidangTbl, {
        foreignKey: 'KDSATKER',
        sourceKey: 'KDSATKER'
      });

      // Relasi dengan ViewDaftarUnitKerja (One to Many)
      SatkerTbl.hasMany(models.ViewDaftarUnitKerja, {
        foreignKey: 'kd_unit_kerja',
        sourceKey: 'KDSATKER',
        as: 'viewUnitKerja'
      });
    }
  }

  SatkerTbl.init(
    {
      KDSATKER: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        field: 'KDSATKER'
      },
      KDSKPD: {
        type: DataTypes.STRING(3),
        allowNull: false,
        field: 'KDSKPD'
      },
      NMSATKER: {
        type: DataTypes.STRING(75),
        allowNull: true,
        field: 'NMSATKER'
      },
      NAMA_JABATAN: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NAMA_JABATAN'
      },
      STATUS_SATKER: {
        type: DataTypes.CHAR(1),
        allowNull: true,
        field: 'STATUS_SATKER'
      },
      TANGGAL_DIBUAT: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TANGGAL_DIBUAT'
      },
      KETERANGAN_SATKER: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'KETERANGAN_SATKER'
      },
      KDESELON: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'KDESELON'
      },
      BUP: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        field: 'BUP'
      },
      JENIS_JABATAN: {
        type: DataTypes.ENUM('Struktural', 'Tugas Tambahan'),
        allowNull: true,
        field: 'JENIS_JABATAN'
      },
      NO_URUT: {
        type: DataTypes.INTEGER(11),
        allowNull: true,
        field: 'NO_URUT'
      },
      KODE_SIASN: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'KODE_SIASN'
      }
    },
    {
      sequelize,
      modelName: "SatkerTbl",
      tableName: "satker_tbl",
      timestamps: false,
    }
  );

  return SatkerTbl;
};