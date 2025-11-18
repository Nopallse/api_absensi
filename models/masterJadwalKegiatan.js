"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MasterJadwalKegiatan extends Model {
    static associate(models) {
      MasterJadwalKegiatan.hasMany(models.JadwalKegiatanLokasiSatker, { foreignKey: "id_kegiatan" });
      MasterJadwalKegiatan.belongsToMany(models.Lokasi, { 
        through: models.JadwalKegiatanLokasiSatker,
        foreignKey: "id_kegiatan",
        otherKey: "lokasi_id"
      });
      
      // Relasi dengan kehadiran kegiatan
      MasterJadwalKegiatan.hasMany(models.KehadiranKegiatan, { 
        foreignKey: "id_kegiatan",
        as: 'kehadiran'
      });
      
      // Relasi dengan grup peserta kegiatan
      MasterJadwalKegiatan.hasMany(models.GrupPesertaKegiatan, { 
        foreignKey: "id_kegiatan",
        as: 'grup_peserta'
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
      },
      jam_mulai: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Jam mulai kegiatan dalam format HH:MM:SS'
      },
      jam_selesai: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Jam selesai kegiatan dalam format HH:MM:SS'
      },
      include_absen: {
        type: DataTypes.ENUM('none', 'pagi', 'sore', 'keduanya'),
        allowNull: false,
        defaultValue: 'none',
        comment: 'Ketentuan absen: none=Hanya kehadiran kegiatan, pagi=Menggantikan absen pagi, sore=Menggantikan absen sore, keduanya=Menggantikan absen pagi dan sore'
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