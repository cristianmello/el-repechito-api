// src/controllers/orders/getMyOrders.js
const Order = require('../../models/order');
const OrderItem = require('../../models/orderitem');
const Payment = require('../../models/payment');

module.exports = async (req, res) => {
    try {
        // soportar ambas formas que el middleware puede usar
        const userCode = req.user?.user_code || req.user?.sub;
        if (!userCode) {
            return res.status(401).json({
                status: 'error',
                message: 'Usuario no autenticado'
            });
        }

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
        const offset = (page - 1) * limit;

        const { rows: orders, count } = await Order.findAndCountAll({
            where: { user_code: Number(userCode) },
            order: [['created_at', 'DESC']],
            limit,
            offset,
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
                }
            ]
        });

        return res.status(200).json({
            status: 'success',
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            },
            data: orders
        });

    } catch (err) {
        console.error('[Orders][GetMyOrders]', err);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno al obtener tus pedidos'
        });
    }
};
