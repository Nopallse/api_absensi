require('dotenv').config();

module.exports = {
  development: {
    main: {
      username: process.env.DEV_MAIN_USERNAME || 'root',
      password: process.env.DEV_MAIN_PASSWORD || '',
      database: process.env.DEV_MAIN_DATABASE || 'api_absensi_dev',
      host: process.env.DEV_MAIN_HOST || 'localhost',
      dialect: process.env.DEV_MAIN_DIALECT || 'mysql',
      port: process.env.DEV_MAIN_PORT || 3306,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    master: {
      username: process.env.DEV_MASTER_USERNAME || 'root',
      password: process.env.DEV_MASTER_PASSWORD || '',
      database: process.env.DEV_MASTER_DATABASE || 'master_db',
      host: process.env.DEV_MASTER_HOST || 'localhost',
      dialect: process.env.DEV_MASTER_DIALECT || 'mysql',
      port: process.env.DEV_MASTER_PORT || 3306,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  },
  test: {
    main: {
      username: process.env.TEST_MAIN_USERNAME || 'root',
      password: process.env.TEST_MAIN_PASSWORD || '',
      database: process.env.TEST_MAIN_DATABASE || 'api_absensi_test',
      host: process.env.TEST_MAIN_HOST || 'localhost',
      dialect: process.env.TEST_MAIN_DIALECT || 'mysql',
      port: process.env.TEST_MAIN_PORT || 3306,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    master: {
      username: process.env.TEST_MASTER_USERNAME || 'root',
      password: process.env.TEST_MASTER_PASSWORD || '',
      database: process.env.TEST_MASTER_DATABASE || 'master_db_test',
      host: process.env.TEST_MASTER_HOST || 'localhost',
      dialect: process.env.TEST_MASTER_DIALECT || 'mysql',
      port: process.env.TEST_MASTER_PORT || 3306,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  },
  production: {
    main: {
      username: process.env.PROD_MAIN_USERNAME,
      password: process.env.PROD_MAIN_PASSWORD,
      database: process.env.PROD_MAIN_DATABASE,
      host: process.env.PROD_MAIN_HOST,
      dialect: process.env.PROD_MAIN_DIALECT || 'mysql',
      port: process.env.PROD_MAIN_PORT || 3306,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    master: {
      username: process.env.PROD_MASTER_USERNAME,
      password: process.env.PROD_MASTER_PASSWORD,
      database: process.env.PROD_MASTER_DATABASE,
      host: process.env.PROD_MASTER_HOST,
      dialect: process.env.PROD_MASTER_DIALECT || 'mysql',
      port: process.env.PROD_MASTER_PORT || 3306,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  }
};