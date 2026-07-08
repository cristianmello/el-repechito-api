// models/Order.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Order = sequelize.define('Order', {
    order_code: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    customer_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notNull: { msg: 'El nombre del cliente no puede ser nulo' },
            len: { args: [2, 100], msg: 'El nombre debe tener entre 2 y 100 caracteres' },
            is: {
                args: /^[a-zñáéíóú\s]+$/i,
                msg: 'El nombre solo puede contener letras, acentos y espacios'
            }
        }
    },
    customer_lastname: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            notNull: { msg: 'El apellido del cliente no puede ser nulo' },
            len: { args: [2, 150], msg: 'El apellido debe tener entre 2 y 150 caracteres' },
            is: {
                args: /^[a-zñáéíóú\s]+$/i,
                msg: 'El apellido solo puede contener letras, acentos y espacios'
            }
        }
    },
    customer_phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
        validate: {
            isValidPhone(value) {
                if (value === null || value === '') return;
                const phoneRegex = /^[\d\s+\-()]+$/;
                if (!phoneRegex.test(value)) throw new Error('Formato de teléfono inválido');
                if (value.length < 7 || value.length > 30) throw new Error('El teléfono debe tener entre 7 y 30 caracteres');
            }
        }
    },
    pickup_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: 'Debe ser una fecha válida' }
        }
    },
    pickup_time: {
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
            notNull: { msg: 'La hora de retiro es obligatoria' }
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'ready', 'cancelled', 'completed'),
        allowNull: false,
        defaultValue: 'pending'
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            isDecimal: { msg: 'El total debe ser un número válido' },
            min: { args: [0], msg: 'El total no puede ser negativo' }
        }
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
    },
    payment_method: {
        type: DataTypes.ENUM('card', 'mercadopago', 'cash'),
        allowNull: false,
        defaultValue: 'cash'
    },
    user_code: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'user_code'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    },
    notes: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            len: { args: [0, 500], msg: 'Las notas no pueden superar 500 caracteres' }
        }
    },
    idempotency_key: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    }

}, {
    tableName: 'orders',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { fields: ['user_code'] },
        { fields: ['status'] },
        { fields: ['pickup_date'] },
        { fields: ['payment_status'] }
    ],
    defaultScope: {
        attributes: { exclude: [] }
    },
    scopes: {
        pending: { where: { status: 'pending' } },
        paid: { where: { payment_status: 'approved' } },
        byDate(date) { return { where: { pickup_date: date } }; }
    },
    validate: {
        pickupInFuture() {
            if (!this.pickup_date || !this.pickup_time) return;

            // Construimos un Date para comparar (asume formato ISO date y HH:MM:SS)
            const dtString = `${this.pickup_date}T${this.pickup_time}`;
            const pickup = new Date(dtString);
            const now = new Date();

            // Permitir reservas para hoy solo si la hora es posterior a ahora
            if (isNaN(pickup.getTime())) {
                throw new Error('Fecha u hora de retiro inválida');
            }
            // Se permite crear pedidos para el mismo día a horas futuras
            if (pickup < now) {
                throw new Error('La fecha y hora de retiro deben ser en el futuro');
            }
        }
    },
    hooks: {
        beforeCreate: (order) => {
            // Normalizaciones mínimas
            if (order.customer_name) order.customer_name = order.customer_name.trim();
            if (order.customer_lastname) order.customer_lastname = order.customer_lastname.trim();
        }
    }
});

module.exports = Order;
