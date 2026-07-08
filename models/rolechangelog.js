const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const RoleChangeLog = sequelize.define('RoleChangeLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_code: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: { msg: 'El ID del usuario debe ser un número entero' }
    }
  },
  old_role_code: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: { msg: 'El código del rol anterior debe ser un número entero' }
    }
  },
  new_role_code: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: { msg: 'El código del nuevo rol debe ser un número entero' }
    }
  },
  changed_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: { msg: 'El ID del modificador debe ser un número entero' }
    }
  },
  changed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'role_change_logs',
  timestamps: false,
  indexes: [
    { fields: ['user_code'] },
    { fields: ['changed_by'] },
    { fields: ['changed_at'] }
  ]
});

module.exports = RoleChangeLog;
