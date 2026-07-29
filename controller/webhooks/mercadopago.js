const crypto = require('crypto');
const Payment = require('../../models/payment');
const Order = require('../../models/order');
const MercadoPagoService = require('../../services/mercadopago');

/**
 * Verifica firma MercadoPago
 */
function verifySignature(req) {
    const signature = req.headers['x-signature'];
    if (!signature) return false;

    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) return true; // fallback dev

    const expected = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('hex');

    return signature === expected;
}

module.exports = async (req, res) => {
    try {
        // 🔐 Seguridad
        if (!verifySignature(req)) {
            console.warn('[Webhook][MP] Firma inválida');
            return res.status(200).json({ received: true });
        }

        const eventType = req.body.type || req.body.topic;
        const dataId = req.body.data?.id || req.query['data.id'];

        if (eventType !== 'payment' || !dataId) {
            return res.status(200).json({ received: true });
        }

        if (!MercadoPagoService) {
            console.warn('[Webhook][MP] Servicio no configurado');
            return res.status(200).json({ received: true });
        }

        // 1️⃣ Obtener pago real desde MP
        const providerPayment = await MercadoPagoService.getPayment(dataId);
        if (!providerPayment) {
            return res.status(200).json({ received: true });
        }

        // 2️⃣ Buscar Payment local
        let payment = await Payment.findOne({
            where: { provider_payment_id: String(providerPayment.id) }
        });

        // 🔁 fallback por external_reference
        if (!payment && providerPayment.external_reference) {
            payment = await Payment.findOne({
                where: { order_code: providerPayment.external_reference }
            });
        }

        if (!payment) {
            console.warn(`[Webhook][MP] Payment no encontrado: ${providerPayment.id}`);
            return res.status(200).json({ received: true });
        }

        // 🔁 IDEMPOTENCIA
        if (payment.status === providerPayment.status) {
            return res.status(200).json({ received: true });
        }

        const order = await Order.findByPk(payment.order_code);
        if (!order) {
            return res.status(200).json({ received: true });
        }

        // 3️⃣ Estados
        if (providerPayment.status === 'approved') {
            await payment.update({
                status: 'approved',
                provider_payment_id: String(providerPayment.id),
                raw_response: providerPayment
            });

            await order.update({
                payment_status: 'paid',
                status: 'confirmed'
            });
        }

        if (providerPayment.status === 'pending') {
            await payment.update({
                status: 'pending',
                raw_response: providerPayment
            });
        }

        if (['rejected', 'cancelled'].includes(providerPayment.status)) {
            await payment.update({
                status: 'rejected',
                raw_response: providerPayment
            });

            await order.update({
                payment_status: 'rejected',
                status: 'payment_failed'
            });
        }

        if (providerPayment.status === 'refunded') {
            await payment.update({
                status: 'refunded',
                raw_response: providerPayment
            });

            await order.update({
                payment_status: 'refunded',
                status: 'refunded'
            });
        }

        return res.status(200).json({ received: true });

    } catch (err) {
        console.error('[Webhook][MercadoPago]', err);
        return res.status(200).json({ received: true });
    }
};
