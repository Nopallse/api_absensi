"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SkpdTbl extends Model {
    static associate(models) {
      // Relasi dengan mstpegawai
      SkpdTbl.hasMany(models.MstPegawai, {
        foreignKey: 'KDSKPD',
        sourceKey: 'KDSKPD'
      });

      // Relasi dengan satker_tbl (One to Many)
      SkpdTbl.hasMany(models.SatkerTbl, {
        foreignKey: 'KDSKPD',
        sourceKey: 'KDSKPD'
      });
    }
  }

  SkpdTbl.init(
    {
      KDSKPD: {
        type: DataTypes.STRING(10),
        primaryKey: true,
        allowNull: false,
        defaultValue: '',
        field: 'KDSKPD'
      },
      NMSKPD: {
        type: DataTypes.STRING(70),
        allowNull: true,
        field: 'NMSKPD'
      },
      StatusSKPD: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'StatusSKPD'
      }
    },
    {
      sequelize,
      modelName: "SkpdTbl",
      tableName: "skpd_tbl",
      timestamps: false,
    }
  );

  return SkpdTbl;
}; 