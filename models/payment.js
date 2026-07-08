// models/Payment.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Payment = sequelize.define('Payment', {
    payment_code: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        primaryKey: true
    },
    order_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'orders',
            key: 'order_code'
        },
        onDelete: 'CASCADE'
    },
    provider: {
        type: DataTypes.ENUM('mercadopago', 'card', 'cash'),
        allowNull: false
    },
    provider_payment_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'ID que devuelve el proveedor (MercadoPago, Stripe, etc)'
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(10),
        defaultValue: 'UYU'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'refunded'),
        defaultValue: 'pending',
        allowNull: false
    },
    raw_response: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Respuesta completa del proveedor (para debugging)'
    }
}, {
    tableName: 'payments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        { fields: ['order_code'] },
        { fields: ['provider_payment_id'] }
    ]
});

module.exports = Payment;
