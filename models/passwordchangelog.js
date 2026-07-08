const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const PasswordChangeLog = sequelize.define('PasswordChangeLog', {
    log_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_code'
        }
    },
    user_mail: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'password_change_logs',
    timestamps: false
});

module.exports = PasswordChangeLog;
