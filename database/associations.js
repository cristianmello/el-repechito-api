// models/associations.js
const Role = require('../models/role');
const User = require('../models/user');
const Category = require('../models/category');
const Product = require('../models/product');
const Order = require('../models/order');
const OrderItem = require('../models/orderitem');
const Payment = require('../models/payment');

const database = require('./connection');

/*
  1) Role -> User (1 - N)
*/
Role.hasMany(User, {
    as: 'users',
    foreignKey: 'role_code',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
User.belongsTo(Role, {
    as: 'role',
    foreignKey: 'role_code'
});

/*
  2) Category -> Product (1 - N)
*/
Category.hasMany(Product, {
    as: 'products',
    foreignKey: 'category_code',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
Product.belongsTo(Category, {
    as: 'category',
    foreignKey: 'category_code'
});

/*
  3) Product -> OrderItem (1 - N)
     OrderItem -> Product (N - 1)
     (cada item referencia el producto y mantiene snapshot de nombre/precio)
*/
Product.hasMany(OrderItem, {
    as: 'orderItems',
    foreignKey: 'product_code',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
OrderItem.belongsTo(Product, {
    as: 'product',
    foreignKey: 'product_code'
});

/*
  4) Order -> OrderItem (1 - N)
     OrderItem -> Order (N - 1)
*/
Order.hasMany(OrderItem, {
    as: 'items',
    foreignKey: 'order_code',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
OrderItem.belongsTo(Order, {
    as: 'order',
    foreignKey: 'order_code'
});

/*
  5) User -> Order (1 - N)  (user_code nullable en Order)
     Order -> User (N - 1)
*/
User.hasMany(Order, {
    as: 'orders',
    foreignKey: 'user_code',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
Order.belongsTo(User, {
    as: 'user',
    foreignKey: 'user_code'
});

/*
  6) Order -> Payment (1 - N)
     Payment -> Order (N - 1)
*/
Order.hasMany(Payment, {
    as: 'payments',
    foreignKey: 'order_code',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Payment.belongsTo(Order, {
    as: 'order',
    foreignKey: 'order_code'
});

/*
  7) (Opcional) relaciones comodín para consultas rápidas:
     - Product <-> Order a través de OrderItem (M-N) si las necesitás
*/
Product.belongsToMany(Order, {
    through: OrderItem,
    foreignKey: 'product_code',
    otherKey: 'order_code',
    as: 'orders'
});
Order.belongsToMany(Product, {
    through: OrderItem,
    foreignKey: 'order_code',
    otherKey: 'product_code',
    as: 'products'
});

module.exports = database;
