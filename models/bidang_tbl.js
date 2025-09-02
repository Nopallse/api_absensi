"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BidangTbl extends Model {
    static associate(models) {
      // Relasi dengan Satker (Many to One)
      BidangTbl.belongsTo(models.SatkerTbl, {
        foreignKey: 'KDSATKER',
        targetKey: 'KDSATKER'
      });
    }
  }

  BidangTbl.init(
    {
      BIDANGF: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        field: 'BIDANGF'
      },
      NMBIDANG: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NMBIDANG'
      },
      NAMA_JABATAN: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NAMA_JABATAN'
      },
      KDSATKER: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'KDSATKER'
      },
      STATUS_BIDANG: {
        type: DataTypes.CHAR(1),
        allowNull: true,
        field: 'STATUS_BIDANG'
      },
      TANGGAL_DIBUAT: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TANGGAL_DIBUAT'
      },
      KETERANGAN: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'KETERANGAN'
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
      KODE_SIASN: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'KODE_SIASN'
      }
    },
    {
      sequelize,
      modelName: "BidangTbl",
      tableName: "bidang_tbl",
      timestamps: false,
    }
  );

  return BidangTbl;
};
