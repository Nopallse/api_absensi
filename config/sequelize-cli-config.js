require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DEV_MAIN_USERNAME,
    password: process.env.DEV_MAIN_PASSWORD,
    database: process.env.DEV_MAIN_DATABASE,
    host: process.env.DEV_MAIN_HOST,
    dialect: process.env.DEV_MAIN_DIALECT || 'mysql'
  },
  test: {
    username: process.env.TEST_MAIN_USERNAME,
    password: process.env.TEST_MAIN_PASSWORD,
    database: process.env.TEST_MAIN_DATABASE,
    host: process.env.TEST_MAIN_HOST,
    dialect: process.env.TEST_MAIN_DIALECT || 'mysql'
  },
  production: {
    username: process.env.PROD_MAIN_USERNAME,
    password: process.env.PROD_MAIN_PASSWORD,
    database: process.env.PROD_MAIN_DATABASE,
    host: process.env.PROD_MAIN_HOST,
    dialect: process.env.PROD_MAIN_DIALECT || 'mysql'
  }
};