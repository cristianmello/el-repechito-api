// services/orderStatusService.js

const FINAL_STATES = ['completed', 'cancelled'];

function canUpdateOrder(order) {
    return !FINAL_STATES.includes(order.status);
}

function canCancelOrder(order) {
    return !['completed', 'cancelled'].includes(order.status);
}

function applyPaymentApproved(order) {
    return {
        status: 'paid',
        payment_status: 'approved'
    };
}

function applyPaymentRejected(order) {
    return {
        status: 'cancelled',
        payment_status: 'rejected'
    };
}

function applyRefund(order) {
    return {
        status: 'cancelled',
        payment_status: 'refunded'
    };
}

module.exports = {
    canUpdateOrder,
    canCancelOrder,
    applyPaymentApproved,
    applyPaymentRejected,
    applyRefund
};
