// models/Product.js
const { DataTypes, Op } = require('sequelize');
const slugify = require('slugify');
const sequelize = require('../database/connection');

const Product = sequelize.define('Product', {
    product_code: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    product_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
            notNull: { msg: 'El nombre no puede ser nulo' },
            len: { args: [2, 200], msg: 'El nombre debe tener entre 2 y 200 caracteres' }
        }
    },
    product_slug: {
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: {
            name: 'uq_product_slug',
            msg: 'Ya existe un producto con este slug'
        },
        validate: {
            notNull: { msg: 'El identificador para la URL no puede ser nulo' },
            is: {
                args: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
                msg: 'El slug solo puede contener letras, números y guiones'
            },
            len: { args: [2, 200], msg: 'El slug debe tener entre 2 y 200 caracteres' }
        }
    },
    short_description: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            len: { args: [0, 500], msg: 'La descripción corta no puede superar 500 caracteres' }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    image_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
            isUrl: { msg: 'Debe ser una URL válida para la imagen' }
        }
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: { msg: 'El precio debe ser un número válido' },
            min: { args: [0], msg: 'El precio no puede ser negativo' }
        }
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            isInt: { msg: 'El stock debe ser un número entero' },
            min: { args: [0], msg: 'El stock no puede ser negativo' }
        }
    },
    unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'unidad',
        validate: {
            len: { args: [1, 20], msg: 'Unidad inválida' }
        }
    },
    sku: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: false
    },
    barcode: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    category_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'category_code'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [
        { name: 'idx_product_slug', unique: true, fields: ['product_slug'] },
        { fields: ['category_code'] },
        { fields: ['is_active'] }
    ],
    defaultScope: {
        where: {}
    },
    scopes: {
        available: {
            where: { is_active: true, stock: { [Op.gt]: 0 } }
        }
    },
    hooks: {
        beforeValidate: (product) => {
            // normalizar slug si no se pasó
            if (!product.product_slug && product.product_name) {
                const s = slugify(product.product_name, { lower: true, strict: true });
                product.product_slug = s.length ? s : `${product.product_name}`.toLowerCase().replace(/\s+/g, '-');
            }
        }
    }
});

module.exports = Product;
