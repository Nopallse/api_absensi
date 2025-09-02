"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JamDinasDetail extends Model {
    static associate(models) {
      // Relasi dengan JamDinas
      JamDinasDetail.belongsTo(models.JamDinas, {
        foreignKey: 'id_jamdinas',
        as: 'jamDinas'
      });
    }
  }

  JamDinasDetail.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      id_jamdinas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'jam_dinas',
          key: 'id'
        }
      },
      hari: {
        type: DataTypes.ENUM('senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'),
        allowNull: false,
      },
      tipe: {
        type: DataTypes.ENUM('normal', 'ramadhan'),
        allowNull: false,
        defaultValue: 'normal'
      },
      jam_masuk_mulai: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Waktu mulai jam masuk'
      },
      jam_masuk_selesai: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Waktu selesai jam masuk'
      },
      jam_pulang_mulai: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Waktu mulai jam pulang'
      },
      jam_pulang_selesai: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Waktu selesai jam pulang'
      },
    },
    {
      sequelize,
      modelName: "JamDinasDetail",
      tableName: "jam_dinas_detail",
      underscored: true,
      timestamps: true,
    }
  );

  return JamDinasDetail;
};
