const MP_BASE_URL = 'https://api.mercadopago.com';

function authHeaders(extra = {}) {
    return {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        ...extra
    };
}

async function mpFetch(path, options = {}) {
    const res = await fetch(`${MP_BASE_URL}${path}`, options);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const message = data?.message || `MercadoPago HTTP ${res.status}`;
        const err = new Error(message);
        err.status = res.status;
        err.response = data;
        throw err;
    }

    return data;
}

/**
 * Obtiene un pago desde MercadoPago
 */
async function getPayment(paymentId) {
    return mpFetch(`/v1/payments/${paymentId}`, {
        headers: authHeaders()
    });
}

/**
 * Crea un cobro (pago) en MercadoPago
 */
async function charge({ amount, orderId, source, idempotencyKey }) {
    return mpFetch('/v1/payments', {
        method: 'POST',
        headers: authHeaders(
            idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}
        ),
        body: JSON.stringify({
            transaction_amount: Number(amount),
            token: source,
            external_reference: String(orderId)
        })
    });
}

/**
 * Reembolsa un pago en MercadoPago
 */
async function refund({ providerPaymentId, amount }) {
    const body = amount != null ? { amount: Number(amount) } : {};

    const data = await mpFetch(`/v1/payments/${providerPaymentId}/refunds`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
    });

    return { status: 'success', ...data };
}

module.exports = {
    charge,
    refund,
    getPayment
};
