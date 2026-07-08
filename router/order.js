const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/verifytoken');
const authorize = require('../middleware/authorizerole');
const idempotency = require('../middleware/idempotency');

// Controllers
const createOrder = require('../controller/orders/createorder');
const getOrderById = require('../controller/orders/getorderbyid');
const getMyOrders = require('../controller/orders/getmyorders');
const getAllOrders = require('../controller/orders/getallorders');
const updateOrderStatus = require('../controller/orders/updateorderstatus');
const cancelOrder = require('../controller/orders/cancelorder');

// =====================
// CLIENTE
// =====================

// Crear orden (idempotente 🔐)
router.post(
    '/',
    authenticate,
    idempotency,
    createOrder
);

// Mis órdenes
router.get(
    '/my',
    authenticate,
    getMyOrders
);

// Obtener una orden específica
router.get(
    '/:id',
    authenticate,
    getOrderById
);

// =====================
// ADMIN
// =====================

// Todas las órdenes
router.get(
    '/',
    authenticate,
    authorize('admin', 'superadmin'),
    getAllOrders
);

// Cambiar estado
router.patch(
    '/:id/status',
    authenticate,
    authorize('admin', 'superadmin'),
    updateOrderStatus
);

// Cancelar orden
router.patch(
    '/:id/cancel',
    authenticate,
    authorize('admin', 'superadmin'),
    cancelOrder
);

module.exports = router;
