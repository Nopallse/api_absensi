"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DinasSetjam extends Model {
    static associate(models) {
      // Relasi dengan JamDinas
      DinasSetjam.belongsTo(models.JamDinas, {
        foreignKey: 'id_jamdinas',
        as: 'jamDinas'
      });
      
      // Relasi dengan SKPD (jika diperlukan)
      // DinasSetjam.belongsTo(models.SkpdTbl, {
      //   foreignKey: 'id_skpd',
      //   targetKey: 'KDSKPD',
      //   as: 'skpd'
      // });
      
      // Relasi dengan Satker (jika diperlukan)
      // DinasSetjam.belongsTo(models.SatkerTbl, {
      //   foreignKey: 'id_satker',
      //   targetKey: 'KDSATKER',
      //   as: 'satker'
      // });
      
      // Relasi dengan Bidang (jika diperlukan)
      // DinasSetjam.belongsTo(models.BidangTbl, {
      //   foreignKey: 'id_bidang',
      //   targetKey: 'BIDANGF',
      //   as: 'bidang'
      // });
    }
  }

  DinasSetjam.init(
    {
      dinset_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      dinset_nama: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nama assignment jam dinas'
      },
      id_skpd: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID SKPD yang menggunakan jam dinas ini'
      },
      id_satker: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID Satker yang menggunakan jam dinas ini'
      },
      id_bidang: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID Bidang yang menggunakan jam dinas ini'
      },
      id_jamdinas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'jam_dinas',
          key: 'id'
        },
        comment: 'Referensi ke jam_dinas'
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
      modelName: "DinasSetjam",
      tableName: "dinas_setjam",
      underscored: true,
      timestamps: true,
    }
  );

  return DinasSetjam;
};
