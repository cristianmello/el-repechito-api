// models/OrderItem.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const OrderItem = sequelize.define('OrderItem', {
    order_item_code: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    order_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'order_code'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    product_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'product_code'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
    },

    // Snapshot del producto al momento de la compra
    product_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            notNull: { msg: 'El nombre del producto es obligatorio' },
            len: {
                args: [2, 255],
                msg: 'El nombre del producto debe tener entre 2 y 255 caracteres'
            }
        }
    },
    unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: { msg: 'El precio unitario debe ser un número válido' },
            min: { args: [0], msg: 'El precio unitario no puede ser negativo' }
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: { msg: 'La cantidad debe ser un número entero' },
            min: { args: [1], msg: 'La cantidad debe ser al menos 1' }
        }
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: { msg: 'El subtotal debe ser un número válido' },
            min: { args: [0], msg: 'El subtotal no puede ser negativo' }
        }
    }
}, {
    tableName: 'order_items',
    underscored: true,
    timestamps: false,
    indexes: [
        { fields: ['order_code'] },
        { fields: ['product_code'] }
    ],
    hooks: {
        beforeValidate: (item) => {
            // Calcula automáticamente el subtotal
            if (item.unit_price != null && item.quantity != null) {
                item.subtotal = (
                    parseFloat(item.unit_price) * parseInt(item.quantity, 10)
                ).toFixed(2);
            }
        }
    }
});

module.exports = OrderItem;