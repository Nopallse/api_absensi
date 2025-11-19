"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Jabatan extends Model {
    static associate(models) {
      // Relasi dengan pegawai (mstpegawai)
      Jabatan.hasMany(models.MstPegawai, {
        foreignKey: 'KODE_JABATAN',
        sourceKey: 'kode_jabatan',
        as: 'pegawai'
      });
    }
  }

  Jabatan.init(
    {
      id_jabatan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id_jabatan'
      },
      kode_jabatan: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'kode_jabatan'
      },
      nama_jabatan: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'nama_jabatan'
      }
    },
    {
      sequelize,
      modelName: "Jabatan",
      tableName: "jabatan",
      timestamps: false
    }
  );

  return Jabatan;
};

