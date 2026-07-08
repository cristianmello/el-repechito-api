const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const ProfileChangeLog = sequelize.define('ProfileChangeLog', {
    log_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_code: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_code',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    },
    changed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_code',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    },
    field: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    old_value: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    new_value: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    changed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'profile_change_logs',
    timestamps: false,
});

module.exports = ProfileChangeLog;
