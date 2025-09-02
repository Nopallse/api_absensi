require('dotenv').config();

module.exports = {
  development: {
    // Database utama untuk aplikasi
    main: {
      username: process.env.DEV_USERNAME,
      password: process.env.DEV_PASSWORD,
      database: process.env.DEV_DATABASE,
      host: process.env.DEV_HOST,
      dialect: process.env.DEV_DIALECT
    },
    // Database master untuk user
    master: {
      username: process.env.DEV_MASTER_USERNAME,
      password: process.env.DEV_MASTER_PASSWORD,
      database: process.env.DEV_MASTER_DATABASE,
      host: process.env.DEV_MASTER_HOST,
      dialect: process.env.DEV_MASTER_DIALECT
    }
  },
  test: {
    main: {
      username: process.env.TEST_USERNAME,
      password: process.env.TEST_PASSWORD,
      database: process.env.TEST_DATABASE,
      host: process.env.TEST_HOST,
      dialect: process.env.TEST_DIALECT
    },
    master: {
      username: process.env.TEST_MASTER_USERNAME,
      password: process.env.TEST_MASTER_PASSWORD,
      database: process.env.TEST_MASTER_DATABASE,
      host: process.env.TEST_MASTER_HOST,
      dialect: process.env.TEST_MASTER_DIALECT
    }
  },
  production: {
    main: {
      username: process.env.PROD_USERNAME,
      password: process.env.PROD_PASSWORD,
      database: process.env.PROD_DATABASE,
      host: process.env.PROD_HOST,
      dialect: process.env.PROD_DIALECT
    },
    master: {
      username: process.env.PROD_MASTER_USERNAME,
      password: process.env.PROD_MASTER_PASSWORD,
      database: process.env.PROD_MASTER_DATABASE,
      host: process.env.PROD_MASTER_HOST,
      dialect: process.env.PROD_MASTER_DIALECT
    }
  }
};