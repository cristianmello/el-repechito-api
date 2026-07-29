// src/services/payment.service.js

const Payment = require('../models/payment');
const Order = require('../models/order');
const { restoreStockFromOrder } = require('./stock.service');

let MercadoPagoService = null;
try {
    MercadoPagoService = require('./mercadopago');
} catch (_) {
    // proveedor opcional (tests / entornos sin MP)
}

/**
 * Ejecuta el cobro contra el proveedor externo
 * ❌ NO aplica para cash
 */
async function chargePayment({ payment, order, token }) {
    if (payment.provider === 'cash') {
        throw new Error('chargePayment no aplica para pagos en efectivo');
    }

    if (!MercadoPagoService) {
        throw new Error('Proveedor de pago no configurado');
    }

    return MercadoPagoService.charge({
        amount: payment.amount,
        orderId: order.order_code,
        source: token,
        idempotencyKey: `order-${order.order_code}`
    });
}

/**
 * Sincroniza Payment + Order según la respuesta del proveedor
 * ⚠️ Idempotente
 * 🔥 Hace rollback de stock si el pago falla
 */
async function updatePaymentFromProvider(payment, order, providerResponse) {
    if (!providerResponse) return;

    const status = providerResponse.status;

    // 🔒 IDEMPOTENCIA: si ya está finalizado, no hacemos nada
    if (['approved', 'rejected', 'refunded'].includes(payment.status)) {
        return;
    }

    // ✅ PAGO APROBADO
    if (status === 'approved' || status === 'success') {
        await payment.update({
            status: 'approved',
            provider_payment_id:
                providerResponse.id ||
                providerResponse.provider_id ||
                null,
            raw_response: providerResponse
        });

        await order.update({
            payment_status: 'paid',
            status: 'confirmed'
        });

        return;
    }

    // ⏳ PAGO PENDIENTE
    if (status === 'pending' || status === 'in_process') {
        await payment.update({
            status: 'pending',
            raw_response: providerResponse
        });

        await order.update({
            payment_status: 'pending'
        });

        return;
    }

    // ❌ PAGO FALLIDO / CANCELADO / REEMBOLSADO
    if (['rejected', 'cancelled', 'refunded'].includes(status)) {
        await payment.update({
            status: 'rejected',
            raw_response: providerResponse
        });

        await order.update({
            payment_status: 'rejected',
            status: 'payment_failed'
        });

        // 🔥 ROLLBACK REAL DE STOCK (idempotente)
        await restoreStockFromOrder(order.order_code);
    }
}

/**
 * Reembolso manual (admin / cancelación)
 */
async function refundPayment(payment, order) {
    // 💵 CASH → refund lógico
    if (payment.provider === 'cash') {
        if (payment.status === 'refunded') return;

        await payment.update({ status: 'refunded' });
        await restoreStockFromOrder(order.order_code);
        return;
    }

    if (!MercadoPagoService || !payment.provider_payment_id) {
        await payment.update({ status: 'rejected' });
        return;
    }

    const response = await MercadoPagoService.refund({
        providerPaymentId: payment.provider_payment_id,
        amount: payment.amount
    });

    if (response?.status === 'success') {
        await payment.update({
            status: 'refunded',
            raw_response: response
        });

        await restoreStockFromOrder(order.order_code);
    } else {
        await payment.update({
            status: 'rejected',
            raw_response: response
        });
    }
}

module.exports = {
    chargePayment,
    updatePaymentFromProvider,
    refundPayment
};
