require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DEV_MASTER_USERNAME,
    password: process.env.DEV_MASTER_PASSWORD,
    database: process.env.DEV_MASTER_DATABASE,
    host: process.env.DEV_MASTER_HOST,
    dialect: process.env.DEV_MASTER_DIALECT || 'mysql'
  },
  test: {
    username: process.env.TEST_MASTER_USERNAME,
    password: process.env.TEST_MASTER_PASSWORD,
    database: process.env.TEST_MASTER_DATABASE,
    host: process.env.TEST_MASTER_HOST,
    dialect: process.env.TEST_MASTER_DIALECT || 'mysql'
  },
  production: {
    username: process.env.PROD_MASTER_USERNAME,
    password: process.env.PROD_MASTER_PASSWORD,
    database: process.env.PROD_MASTER_DATABASE,
    host: process.env.PROD_MASTER_HOST,
    dialect: process.env.PROD_MASTER_DIALECT || 'mysql'
  }
};