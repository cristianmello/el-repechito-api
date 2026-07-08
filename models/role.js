const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Role = sequelize.define('Role', {
    role_code: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    role_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: {
            name: 'unique_role_name',
            msg: 'El nombre del rol ya está registrado'
        },
        validate: {
            notNull: { msg: "El nombre del rol no puede ser nulo" },
            len: {
                args: [3, 50],
                msg: "El nombre del rol debe tener entre 3 y 50 caracteres"
            },
            is: {
                args: /^[a-zñáéíóú\s]+$/i,
                msg: "El nombre del rol solo puede contener letras, acentos, la letra 'ñ' y espacios"
            }
        }
    },
    role_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: {
                args: [0, 500],
                msg: 'La descripción del rol no puede superar los 500 caracteres'
            }
        }
    }
}, {
    tableName: 'roles',
    timestamps: false,
    indexes: [
        {
            name: 'idx_unique_role_name',
            unique: true,
            fields: ['role_name']
        }
    ]
});

module.exports = Role;

