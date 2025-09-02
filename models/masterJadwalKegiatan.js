"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MasterJadwalKegiatan extends Model {
    static associate(models) {
      MasterJadwalKegiatan.hasMany(models.JadwalKegiatanLokasiSkpd, { foreignKey: "id_kegiatan" });
      MasterJadwalKegiatan.belongsToMany(models.Lokasi, { 
        through: models.JadwalKegiatanLokasiSkpd,
        foreignKey: "id_kegiatan",
        otherKey: "lokasi_id"
      });
    }
  }
  
  MasterJadwalKegiatan.init(
    {
      id_kegiatan: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tanggal_kegiatan: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Tanggal kegiatan dalam format YYYY-MM-DD'
      },
      jenis_kegiatan: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Jenis kegiatan (Apel Gabungan, Wirid, Senam, dll)'
      },
      keterangan: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Keterangan detail kegiatan'
      }
    },
    {
      sequelize,
      modelName: "MasterJadwalKegiatan",
      tableName: "master_jadwal_kegiatan",
      underscored: true,
      timestamps: false // Karena tabel tidak memiliki created_at/updated_at
    }
  );
  
  return MasterJadwalKegiatan;
}; 