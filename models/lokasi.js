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

      // Relasi dengan satker (Level 1)
      Lokasi.belongsTo(models.SatkerTbl, {
        foreignKey: 'id_satker',
        targetKey: 'KDSATKER',
        as: 'satker'
      });

      // Relasi dengan bidang (Level 2)
      Lokasi.belongsTo(models.BidangTbl, {
        foreignKey: 'id_bidang',
        targetKey: 'BIDANGF',
        as: 'bidang'
      });

      // Relasi dengan sub bidang (Level 3)
      Lokasi.belongsTo(models.BidangSub, {
        foreignKey: 'id_sub_bidang',
        targetKey: 'SUBF',
        as: 'subBidang'
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
      id_satker: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID satker (Level 1) - wajib diisi'
      },
      id_bidang: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID bidang (Level 2) - opsional, jika diisi maka lokasi khusus untuk bidang'
      },
      id_sub_bidang: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID sub bidang (Level 3) - opsional, jika diisi maka lokasi khusus untuk sub bidang'
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