// Reemplaza TODO tu archivo con este código
require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelize;

const poolOptions = {
    max: 25,
    min: 5,
    acquire: 60000,
    idle: 30000
};

if (process.env.NODE_ENV === 'production') {

    sequelize = new Sequelize(process.env.MYSQL_URL, {
        dialect: 'mysql',
        protocol: 'mysql',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: poolOptions
    });

} else {
    sequelize = new Sequelize(process.env.MYSQL_URL, {
        dialect: 'mysql',
        logging: true,
        pool: poolOptions
    });
}

module.exports = sequelize;