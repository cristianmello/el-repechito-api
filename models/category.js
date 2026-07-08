// models/Category.js
const { DataTypes, Op } = require('sequelize');
const slugify = require('slugify');
const sequelize = require('../database/connection');

const Category = sequelize.define('Category', {
    category_code: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    category_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: {
            name: 'uq_category_name',
            msg: 'El nombre de la categoría ya existe'
        },
        validate: {
            notNull: { msg: 'El nombre de la categoría no puede ser nulo' },
            len: { args: [2, 100], msg: 'El nombre debe tener entre 2 y 100 caracteres' }
        }
    },
    category_slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: {
            name: 'uq_category_slug',
            msg: 'El slug de la categoría ya existe'
        },
        validate: {
            notNull: { msg: 'El identificador (slug) no puede ser nulo' },
            len: { args: [2, 100], msg: 'El slug debe tener entre 2 y 100 caracteres' },
            is: {
                args: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
                msg: 'El slug solo puede contener letras, números y guiones'
            }
        }
    },
    description: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            len: { args: [0, 500], msg: 'La descripción no puede superar 500 caracteres' }
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'categories',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { name: 'idx_categories_name', unique: true, fields: ['category_name'] },
        { name: 'idx_categories_slug', unique: true, fields: ['category_slug'] }
    ],
    scopes: {
        minimal: { attributes: ['category_code', 'category_name', 'category_slug'] },
        active: { where: { is_active: true } }
    },
    hooks: {
        beforeValidate: (category) => {
            if (!category.category_slug && category.category_name) {
                const s = slugify(category.category_name, { lower: true, strict: true });
                category.category_slug = s.length ? s : category.category_name.toLowerCase().replace(/\s+/g, '-');
            } else if (category.category_slug) {
                category.category_slug = slugify(category.category_slug, { lower: true, strict: true });
            }
        }
    }
});

module.exports = Category;
