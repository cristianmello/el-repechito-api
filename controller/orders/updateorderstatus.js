const Order = require('../../models/order');
const Payment = require('../../models/payment');
const {
    validateStatus,
    validatePaymentStatus,
    resolveOrderUpdates,
    syncPayments
} = require('../../services/orderStatus.service');

module.exports = async (req, res) => {
    const t = await Order.sequelize.transaction();

    try {
        const orderCode = Number(req.params.id);
        const { status, payment_status } = req.body;

        if (Number.isNaN(orderCode)) {
            await t.rollback();
            return res.status(400).json({ status: 'error', message: 'ID inválido' });
        }

        if (status) validateStatus(status);
        if (payment_status) validatePaymentStatus(payment_status);

        const order = await Order.findByPk(orderCode, {
            include: [{ model: Payment, as: 'payments' }],
            transaction: t
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ status: 'error', message: 'Pedido no encontrado' });
        }

        const updates = resolveOrderUpdates(order, { status, payment_status });

        await order.update(updates, { transaction: t });
        await syncPayments(order, updates, t);

        await t.commit();

        return res.json({
            status: 'success',
            message: 'Pedido actualizado',
            order
        });

    } catch (err) {
        await t.rollback();
        return res.status(409).json({
            status: 'error',
            message: err.message
        });
    }
};
