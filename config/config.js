require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DEV_USERNAME || 'root',
    password: process.env.DEV_PASSWORD || '',
    database: process.env.DEV_DATABASE || 'api_absensi_dev',
    host: process.env.DEV_HOST || 'localhost',
    dialect: process.env.DEV_DIALECT || 'mysql',
    port: process.env.DEV_PORT || 3306,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.TEST_USERNAME || 'root',
    password: process.env.TEST_PASSWORD || '',
    database: process.env.TEST_DATABASE || 'api_absensi_test',
    host: process.env.TEST_HOST || 'localhost',
    dialect: process.env.TEST_DIALECT || 'mysql',
    port: process.env.TEST_PORT || 3306,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    username: process.env.PROD_USERNAME,
    password: process.env.PROD_PASSWORD,
    database: process.env.PROD_DATABASE,
    host: process.env.PROD_HOST,
    dialect: process.env.PROD_DIALECT || 'mysql',
    port: process.env.PROD_PORT || 3306,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};