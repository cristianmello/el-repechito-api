// src/controllers/orders/getAllOrders.js
const Order = require('../../models/order');
const OrderItem = require('../../models/orderitem');
const Payment = require('../../models/payment');
const User = require('../../models/user');

module.exports = async (req, res) => {
    try {
        let { page = 1, limit = 20, status, payment_status, pickup_date, user_code } = req.query;

        const safePage = Math.max(parseInt(page, 10) || 1, 1);
        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const offset = (safePage - 1) * safeLimit;

        const where = {};

        // Validar enums básicos (opcional; ajustá según los enums exactos si cambian)
        const allowedStatuses = ['pending', 'paid', 'ready', 'cancelled', 'completed'];
        const allowedPaymentStatuses = ['pending', 'approved', 'rejected', 'refunded'];

        if (status) {
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ status: 'error', message: 'status inválido' });
            }
            where.status = status;
        }

        if (payment_status) {
            if (!allowedPaymentStatuses.includes(payment_status)) {
                return res.status(400).json({ status: 'error', message: 'payment_status inválido' });
            }
            where.payment_status = payment_status;
        }

        if (pickup_date) {
            where.pickup_date = pickup_date; // podrías validar formato YYYY-MM-DD si querés
        }

        if (user_code) {
            const ucode = parseInt(user_code, 10);
            if (Number.isNaN(ucode)) {
                return res.status(400).json({ status: 'error', message: 'user_code inválido' });
            }
            where.user_code = ucode;
        }

        const { rows: orders, count } = await Order.findAndCountAll({
            where,
            limit: safeLimit,
            offset,
            order: [['created_at', 'DESC']],
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

        return res.status(200).json({
            status: 'success',
            meta: {
                page: safePage,
                limit: safeLimit,
                total: count,
                totalPages: Math.ceil(count / safeLimit)
            },
            data: orders
        });

    } catch (err) {
        console.error('[Orders][GetAll]', err);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno al obtener los pedidos'
        });
    }
};
