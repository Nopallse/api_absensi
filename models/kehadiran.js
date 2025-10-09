"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Kehadiran extends Model {
    static associate(models) {
      // Relasi dengan user
      Kehadiran.belongsTo(models.User, { 
        foreignKey: 'absen_nip',
        targetKey: 'username'
      });
      
      // Relasi dengan lokasi tetap aktif
      Kehadiran.belongsTo(models.Lokasi, { 
        foreignKey: 'lokasi_id',
        targetKey: 'lokasi_id'
      });

      // Relasi dengan kegiatan (opsional)
      Kehadiran.belongsTo(models.MasterJadwalKegiatan, { 
        foreignKey: 'id_kegiatan',
        targetKey: 'id_kegiatan',
        as: 'kegiatan'
      });
    }
  }

  Kehadiran.init(
    {
      absen_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "absen_id",
        allowNull: false,
      },
      absen_nip: {
        type: DataTypes.STRING,
        allowNull: false,
        // Foreign key constraint dinonaktifkan
        // references: {
        //   model: 'user',
        //   key: 'username'
        // }
      },
      lokasi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      absen_tgl: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      absen_tgljam: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      absen_checkin: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      absen_checkout: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      absen_kat: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'HADIR',
        validate: {
          isIn: [['HADIR']]
        }
      },
      absen_apel: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [['HAP', 'TAP']]
        }
      },
      absen_sore: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [['HAS', 'CP']]
        }
      },
    },
    {
      sequelize,
      modelName: "Kehadiran",
      tableName: "kehadiran",
      timestamps: false,
    }
  );

  return Kehadiran;
};