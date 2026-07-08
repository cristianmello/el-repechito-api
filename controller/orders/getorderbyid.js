// src/controllers/orders/getOrderById.js
const Order = require('../../models/order');
const OrderItem = require('../../models/orderitem');
const Product = require('../../models/product');
const Payment = require('../../models/payment');
const User = require('../../models/user');

module.exports = async (req, res) => {
    try {
        const orderCode = parseInt(req.params.id, 10);

        if (Number.isNaN(orderCode)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de orden inválido'
            });
        }

        const order = await Order.findByPk(orderCode, {
            attributes: [
                'order_code',
                'customer_name',
                'customer_lastname',
                'customer_phone',
                'pickup_date',
                'pickup_time',
                'status',
                'payment_status',
                'payment_method',
                'total_amount',
                'notes',
                'user_code',
                'created_at'
            ],
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    attributes: [
                        'order_item_code',
                        'product_code',
                        'product_name',
                        'unit_price',
                        'quantity',
                        'subtotal'
                    ],
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['product_code', 'product_slug']
                        }
                    ]
                },
                {
                    model: Payment,
                    as: 'payments',
                    attributes: [
                        'payment_code',
                        'provider',
                        'provider_payment_id',
                        'amount',
                        'status',
                        'created_at'
                    ]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['user_code', 'user_name', 'user_mail']
                }
            ]
        });

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Orden no encontrada'
            });
        }

        // ============================
        // 🔐 CONTROL DE ACCESO
        // ============================
        if (req.user) {
            const userCode = req.user.user_code || req.user.sub;
            const roles = req.user.roles || [];

            const isAdmin = roles.some(r =>
                ['admin', 'superadmin'].includes(r)
            );

            // Usuario normal: solo su orden
            if (!isAdmin) {
                if (!order.user_code || order.user_code !== userCode) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'No tenés permisos para ver esta orden'
                    });
                }
            }
        } else {
            // No autenticado → solo permitido si es orden pública (si decidís permitirlo)
            return res.status(401).json({
                status: 'error',
                message: 'Autenticación requerida'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: order
        });

    } catch (err) {
        console.error('[Orders][GetById]', err);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno al obtener la orden'
        });
    }
};
