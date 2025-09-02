const { Sequelize } = require('sequelize');
const config = require('./config.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Koneksi database utama
const mainSequelize = new Sequelize(
  dbConfig.main.database,
  dbConfig.main.username,
  dbConfig.main.password,
  {
    host: dbConfig.main.host,
    dialect: dbConfig.main.dialect || 'mysql',
    logging: false
  }
);

// Koneksi database master
const masterSequelize = new Sequelize(
  dbConfig.master.database,
  dbConfig.master.username,
  dbConfig.master.password,
  {
    host: dbConfig.master.host,
    dialect: dbConfig.master.dialect || 'mysql',
    logging: false
  }
);

module.exports = {
  mainSequelize,
  masterSequelize
}; 