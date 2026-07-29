// controllers/payments/webhook.js
const Order = require('../../models/order');
const Payment = require('../../models/payment');
const sequelize = Order.sequelize;
const { restoreStockFromOrder } = require('../../services/stockService');

module.exports = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        // ⚠️ MercadoPago puede enviar varios formatos
        const event = req.body;
        const providerPaymentId =
            event?.data?.id ||
            event?.id ||
            null;

        if (!providerPaymentId) {
            await t.rollback();
            return res.status(400).json({ message: 'Evento inválido' });
        }

        // 🔍 Buscar payment (idempotente)
        const payment = await Payment.findOne({
            where: { provider_payment_id: providerPaymentId },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!payment) {
            await t.rollback();
            return res.status(200).json({ message: 'Payment no registrado aún' });
        }

        // ⛔ Si ya está finalizado, no hacemos nada
        if (['approved', 'rejected', 'refunded'].includes(payment.status)) {
            await t.rollback();
            return res.status(200).json({ message: 'Evento ya procesado' });
        }

        const order = await Order.findByPk(payment.order_code, {
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ message: 'Orden no encontrada' });
        }

        // 🧠 Normalizamos estado del proveedor
        const providerStatus = event.status || event?.data?.status;

        if (providerStatus === 'approved') {
            await payment.update(
                { status: 'approved', raw_response: event },
                { transaction: t }
            );

            await order.update(
                { payment_status: 'approved', status: 'paid' },
                { transaction: t }
            );
        }

        else if (['rejected', 'cancelled', 'expired'].includes(providerStatus)) {
            await payment.update(
                { status: 'rejected', raw_response: event },
                { transaction: t }
            );

            // 🔁 RESTOCK AUTOMÁTICO
            await restoreStockFromOrder(order.order_code, t);

            await order.update(
                { status: 'cancelled', payment_status: 'rejected' },
                { transaction: t }
            );
        }

        else {
            // pending u otros estados
            await payment.update(
                { status: 'pending', raw_response: event },
                { transaction: t }
            );
        }

        await t.commit();

        return res.status(200).json({ received: true });

    } catch (err) {
        await t.rollback();
        console.error('[Webhook][Payment]', err);
        return res.status(500).json({ message: 'Webhook error' });
    }
};
