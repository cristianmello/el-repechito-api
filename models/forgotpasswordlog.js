const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const ForgotPasswordLog = sequelize.define('ForgotPasswordLog', {
  id: {
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
    },
    onDelete: 'CASCADE'
  },
  user_mail: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'password_reset_logs',
  timestamps: true,
  createdAt: 'requested_at',
  updatedAt: false
});

module.exports = ForgotPasswordLog;
