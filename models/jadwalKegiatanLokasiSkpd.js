"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JadwalKegiatanLokasiSkpd extends Model {
    static associate(models) {
      JadwalKegiatanLokasiSkpd.belongsTo(models.MasterJadwalKegiatan, { foreignKey: "id_kegiatan" });
      JadwalKegiatanLokasiSkpd.belongsTo(models.Lokasi, { foreignKey: "lokasi_id" });
      // Note: Tidak ada relasi langsung dengan SkpdTbl karena berbeda database
    }
  }
  
  JadwalKegiatanLokasiSkpd.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_kegiatan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'master_jadwal_kegiatan',
          key: 'id_kegiatan'
        }
      },
      lokasi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'lokasi',
          key: 'lokasi_id'
        }
      },
      kdskpd: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Kode SKPD yang diarahkan ke lokasi ini'
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "JadwalKegiatanLokasiSkpd",
      tableName: "jadwal_kegiatan_lokasi_skpd",
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );
  
  return JadwalKegiatanLokasiSkpd;
}; 