// src/services/orderStatus.service.js
const { Op } = require('sequelize');

const ORDER_STATUS = ['pending', 'confirmed', 'ready', 'completed', 'cancelled'];
const PAYMENT_STATUS = ['pending', 'approved', 'rejected', 'refunded'];

function validateStatus(status) {
    if (!ORDER_STATUS.includes(status)) {
        throw new Error('Estado de pedido inválido');
    }
}

function validatePaymentStatus(paymentStatus) {
    if (!PAYMENT_STATUS.includes(paymentStatus)) {
        throw new Error('Estado de pago inválido');
    }
}

/**
 * Aplica reglas de negocio para actualizar estado de una orden
 */
function resolveOrderUpdates(order, { status, payment_status }) {
    if (['completed', 'cancelled'].includes(order.status)) {
        throw new Error('No se puede modificar un pedido finalizado');
    }

    const updates = {};

    // Pago → Orden
    if (status === 'completed' && order.payment_status !== 'approved') {
        throw new Error('No se puede completar un pedido sin pago aprobado');
    }

    // Refund implica cancelación
    if (payment_status === 'refunded') {
        updates.payment_status = 'refunded';
        updates.status = 'cancelled';
        return updates;
    }

    // Cancelación manual
    if (status === 'cancelled') {
        updates.status = 'cancelled';
        updates.payment_status = 'refunded';
        return updates;
    }

    if (status) updates.status = status;
    if (payment_status) updates.payment_status = payment_status;

    return updates;
}

/**
 * Sincroniza pagos asociados a la orden
 */
async function syncPayments(order, updates, transaction) {
    if (!updates.payment_status || !order.payments?.length) return;

    await Promise.all(
        order.payments.map(p =>
            p.update({ status: updates.payment_status }, { transaction })
        )
    );
}

module.exports = {
    ORDER_STATUS,
    PAYMENT_STATUS,
    validateStatus,
    validatePaymentStatus,
    resolveOrderUpdates,
    syncPayments
};
