"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PesertaGrupKegiatan extends Model {
    static associate(models) {
      // Relasi dengan GrupPesertaKegiatan
      PesertaGrupKegiatan.belongsTo(models.GrupPesertaKegiatan, { 
        foreignKey: "id_grup_peserta",
        as: 'grup'
      });
      
      // Relasi dengan User untuk mendapatkan data pegawai
      PesertaGrupKegiatan.belongsTo(models.User, {
        foreignKey: 'nip',
        targetKey: 'username',
        as: 'pegawai',
        required: false
      });
    }
  }
  
  PesertaGrupKegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_grup_peserta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'grup_peserta_kegiatan',
          key: 'id_grup_peserta'
        }
      },
      nip: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: 'NIP pegawai yang menjadi peserta dalam grup'
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
      modelName: "PesertaGrupKegiatan",
      tableName: "peserta_grup_kegiatan",
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );
  
  return PesertaGrupKegiatan;
};

