// src/controllers/orders/createOrder.js

const Product = require('../../models/product');
const Order = require('../../models/order');
const OrderItem = require('../../models/orderitem');
const Payment = require('../../models/payment');
const redisClient = require('../../services/redisclient');

const {
    chargePayment,
    updatePaymentFromProvider
} = require('../../services/payment.service');

/**
 * Limpieza simple de cache por patrón
 */
async function clearByPattern(pattern) {
    if (!redisClient) return;

    let cursor = '0';
    do {
        const [nextCursor, keys] = await redisClient.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100
        );
        if (keys?.length) await redisClient.del(...keys);
        cursor = nextCursor;
    } while (cursor !== '0');
}

module.exports = async (req, res) => {
    const t = await Product.sequelize.transaction();

    try {
        const {
            customer_name,
            customer_lastname,
            customer_phone,
            pickup_date,
            pickup_time,
            notes = null,
            payment_method = 'cash', // cash | card | mercadopago
            items
        } = req.body;

        // ============================
        // 1️⃣ Validaciones básicas
        // ============================
        if (!Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json({
                status: 'error',
                message: 'La orden debe contener al menos un producto'
            });
        }

        if (!pickup_date || !pickup_time) {
            await t.rollback();
            return res.status(400).json({
                status: 'error',
                message: 'pickup_date y pickup_time son obligatorios'
            });
        }

        // Normalizar cantidades
        for (const it of items) {
            const q = parseInt(it.quantity, 10);
            if (!it.product_code || Number.isNaN(q) || q <= 0) {
                await t.rollback();
                return res.status(400).json({
                    status: 'error',
                    message: 'Items inválidos'
                });
            }
            it.quantity = q;
        }

        // ============================
        // 2️⃣ Lock productos + stock
        // ============================
        const productCodes = items.map(i => i.product_code);

        const products = await Product.findAll({
            where: { product_code: productCodes },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (products.length !== productCodes.length) {
            await t.rollback();
            return res.status(404).json({
                status: 'error',
                message: 'Uno o más productos no existen'
            });
        }

        const productMap = new Map(products.map(p => [p.product_code, p]));

        let totalAmount = 0;
        const orderItemsData = [];

        for (const it of items) {
            const product = productMap.get(it.product_code);

            if (product.stock < it.quantity) {
                await t.rollback();
                return res.status(409).json({
                    status: 'error',
                    message: `Stock insuficiente para ${product.product_name}`
                });
            }

            const unitPrice = Number(product.price);
            const subtotal = Number((unitPrice * it.quantity).toFixed(2));

            totalAmount += subtotal;

            orderItemsData.push({
                product_code: product.product_code,
                product_name: product.product_name,
                unit_price: unitPrice,
                quantity: it.quantity,
                subtotal
            });

            product.stock -= it.quantity;
            await product.save({ transaction: t });
        }

        // ============================
        // 3️⃣ Crear ORDER
        // ============================
        const order = await Order.create({
            customer_name,
            customer_lastname,
            customer_phone,
            pickup_date,
            pickup_time,
            idempotency_key: req.idempotencyKey || null,
            notes,
            payment_method,
            status: 'pending',
            payment_status: payment_method === 'cash' ? 'paid' : 'pending',
            total_amount: totalAmount.toFixed(2),
            user_code: req.user?.user_code || req.user?.sub || null
        }, { transaction: t });

        // ============================
        // 4️⃣ Crear ORDER ITEMS
        // ============================
        for (const it of orderItemsData) {
            await OrderItem.create({
                order_code: order.order_code,
                ...it
            }, { transaction: t });
        }

        // ============================
        // 5️⃣ Crear PAYMENT
        // ============================
        const payment = await Payment.create({
            order_code: order.order_code,
            provider: payment_method,
            amount: totalAmount.toFixed(2),
            status: payment_method === 'cash' ? 'approved' : 'pending'
        }, { transaction: t });

        // ============================
        // 6️⃣ Commit DB
        // ============================
        await t.commit();

        // ============================
        // 7️⃣ Invalidate cache (async)
        // ============================
        clearByPattern('products*');
        clearByPattern('orders*');
        clearByPattern('product_categories*');

        // ============================
        // 8️⃣ Pago async desacoplado
        // ============================
        if (payment.provider !== 'cash') {
            (async () => {
                try {
                    const providerResp = await chargePayment({
                        payment,
                        order,
                        token: req.body.card_token || req.body.payment_token
                    });

                    await updatePaymentFromProvider(
                        payment,
                        order,
                        providerResp
                    );
                } catch (err) {
                    console.error('[Payment][Charge]', err);
                }
            })();
        }

        // ============================
        // 9️⃣ Response
        // ============================
        return res.status(201).json({
            status: 'success',
            message: 'Orden creada correctamente',
            order_code: order.order_code,
            payment_code: payment.payment_code,
            total: totalAmount.toFixed(2)
        });

    } catch (err) {
        try { await t.rollback(); } catch (_) { }
        console.error('[Orders][CreateOrder]', err);

        return res.status(500).json({
            status: 'error',
            message: 'Error interno al crear la orden'
        });
    }
};
