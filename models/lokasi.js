"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Lokasi extends Model {
    static associate(models) {
      // Relasi ke tabel kehadiran
      Lokasi.hasMany(models.Kehadiran, { foreignKey: "lokasi_id" });
      
      // Relasi ke tabel jadwal kegiatan
      Lokasi.hasMany(models.JadwalKegiatanLokasiSkpd, { foreignKey: "lokasi_id" });
      Lokasi.belongsToMany(models.MasterJadwalKegiatan, { 
        through: models.JadwalKegiatanLokasiSkpd,
        foreignKey: "lokasi_id",
        otherKey: "id_kegiatan"
      });
    }
  }

  Lokasi.init(
    {
      lokasi_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'lokasi_id'
      },
      lat: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      lng: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      range: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Radius dalam meter'
      },
      id_skpd: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      id_satker: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      id_bidang: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ket: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Keterangan lokasi'
      },
      status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: '1',
      },
    },
    {
      sequelize,
      modelName: "Lokasi",
      tableName: "lokasi",
      underscored: true,
      timestamps: true,
    }
  );

  return Lokasi;
};