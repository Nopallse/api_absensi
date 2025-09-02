"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AdmOpd extends Model {
    static associate(models) {
      // Relasi dengan user
      AdmOpd.belongsTo(models.User, {
        foreignKey: 'id_user',
        targetKey: 'id'
      });

      // Relasi dengan SKPD
      AdmOpd.belongsTo(models.SkpdTbl, {
        foreignKey: 'id_skpd',
        targetKey: 'KDSKPD'
      });

      // Relasi dengan Satker
      AdmOpd.belongsTo(models.SatkerTbl, {
        foreignKey: 'id_satker',
        targetKey: 'KDSATKER'
      });

      // Relasi dengan Bidang
      AdmOpd.belongsTo(models.BidangTbl, {
        foreignKey: 'id_bidang',
        targetKey: 'BIDANGF'
      });
    }
  }

  AdmOpd.init(
    {
      admopd_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'admopd_id'
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
      }
    },
    {
      sequelize,
      modelName: "AdmOpd",
      tableName: "adm_opd",
      timestamps: false,
    }
  );

  return AdmOpd;
}; 