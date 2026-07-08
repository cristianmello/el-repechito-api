require('dotenv').config();

module.exports = {
  development: {
    url: process.env.MYSQL_URL,
    dialect: 'mysql',
    logging: console.log
  },
  test: {
    url: process.env.MYSQL_URL,
    dialect: 'mysql',
    logging: false
  },
  production: {
    url: process.env.MYSQL_URL,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

