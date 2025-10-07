"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AdmUpt extends Model {
    static associate(models) {
      // Relasi dengan user
      AdmUpt.belongsTo(models.User, {
        foreignKey: 'id_user',
        targetKey: 'id'
      });

      // Relasi dengan SKPD - DIHAPUS karena SkpdTbl sudah tidak digunakan
      // AdmUpt.belongsTo(models.SkpdTbl, {
      //   foreignKey: 'id_skpd',
      //   targetKey: 'KDSKPD'
      // });

      // Relasi dengan Satker
      AdmUpt.belongsTo(models.SatkerTbl, {
        foreignKey: 'id_satker',
        targetKey: 'KDSATKER'
      });

      // Relasi dengan Bidang
      AdmUpt.belongsTo(models.BidangTbl, {
        foreignKey: 'id_bidang',
        targetKey: 'BIDANGF'
      });
    }
  }

  AdmUpt.init(
    {
      admupt_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'admupt_id'
      },
      id_user: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'id_user'
      },
      id_skpd: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'id_skpd'
      },
      id_satker: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'id_satker'
      },
      id_bidang: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'id_bidang'
      },
      kategori: {
        type: DataTypes.SMALLINT(3),
        allowNull: true,
        field: 'kategori'
      },
      umum: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'umum'
      }
    },
    {
      sequelize,
      modelName: "AdmUpt",
      tableName: "adm_upt",
      timestamps: false,
    }
  );

  return AdmUpt;
};
