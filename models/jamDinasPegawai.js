"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JamDinas extends Model {
    static associate(models) {
      // Relasi dengan JamDinasDetail
      JamDinas.hasMany(models.JamDinasDetail, {
        foreignKey: 'id_jamdinas',
        as: 'details'
      });
      
      // Relasi dengan DinasSetjam
      JamDinas.hasMany(models.DinasSetjam, {
        foreignKey: 'id_jamdinas',
        as: 'assignments'
      });
    }
  }

  JamDinas.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nama: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hari_kerja: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        comment: 'Jumlah hari kerja dalam seminggu'
      },
      menit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Total menit kerja per hari'
      },
      status: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 1,
        comment: '1=aktif, 0=nonaktif'
      },
    },
    {
      sequelize,
      modelName: "JamDinas",
      tableName: "jam_dinas_pegawai",
      underscored: true,
      timestamps: true,
    }
  );

  return JamDinas;
}; 