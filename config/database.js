const { Sequelize } = require('sequelize');
const config = require('./config.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Koneksi database utama dengan optimasi performa
const mainSequelize = new Sequelize(
  dbConfig.main.database,
  dbConfig.main.username,
  dbConfig.main.password,
  {
    host: dbConfig.main.host,
    dialect: dbConfig.main.dialect || 'mysql',
    logging: false,
    // Optimasi connection pooling untuk handle 3000+ concurrent users
    pool: {
      max: 100,       // Maksimal 100 koneksi untuk handle 3000+ users
      min: 20,        // Minimal 20 koneksi untuk warm start
      acquire: 60000, // Timeout 60 detik untuk acquire connection
      idle: 30000,    // Close idle connections setelah 30 detik
      evict: 1000,    // Check idle connections setiap 1 detik
      handleDisconnects: true
    },
    // Optimasi query
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    // Optimasi untuk performa
    benchmark: false,
    retry: {
      max: 3
    }
  }
);

// Koneksi database master dengan optimasi performa
const masterSequelize = new Sequelize(
  dbConfig.master.database,
  dbConfig.master.username,
  dbConfig.master.password,
  {
    host: dbConfig.master.host,
    dialect: dbConfig.master.dialect || 'mysql',
    logging: false,
    // Optimasi connection pooling untuk handle 3000+ concurrent users
    pool: {
      max: 50,        // Maksimal 50 koneksi untuk master DB
      min: 10,        // Minimal 10 koneksi
      acquire: 60000, // Timeout 60 detik untuk acquire connection
      idle: 30000,    // Close idle connections setelah 30 detik
      evict: 1000,    // Check idle connections setiap 1 detik
      handleDisconnects: true
    },
    // Optimasi query
    define: {
      timestamps: false, // Master DB biasanya tidak ada timestamps
      underscored: true,
      freezeTableName: true
    },
    // Optimasi untuk performa
    benchmark: false,
    retry: {
      max: 3
    }
  }
);

module.exports = {
  mainSequelize,
  masterSequelize
}; 