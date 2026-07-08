const { Op } = require('sequelize');
const sequelize = require('../database/connection');

const Order = require('../models/order');
const Payment = require('../models/payment');
const { restoreStockFromOrder } = require('./stock.service');

async function expirePendingOrders(minutes = 30) {
    const limitDate = new Date(Date.now() - minutes * 60 * 1000);

    const orders = await Order.findAll({
        where: {
            status: 'pending',
            payment_status: 'pending',
            created_at: { [Op.lt]: limitDate }
        }
    });

    for (const order of orders) {
        await sequelize.transaction(async (t) => {
            // 🔒 lock orden
            await order.reload({ transaction: t, lock: t.LOCK.UPDATE });

            if (
                order.status !== 'pending' ||
                order.payment_status !== 'pending'
            ) {
                return;
            }

            // 🔁 rollback stock
            await restoreStockFromOrder(order.order_code, t);

            // ❌ cancelar orden
            await order.update(
                {
                    status: 'expired',
                    payment_status: 'expired'
                },
                { transaction: t }
            );

            // ❌ cancelar pago si existe
            const payment = await Payment.findOne({
                where: { order_code: order.order_code },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (payment) {
                await payment.update(
                    { status: 'expired' },
                    { transaction: t }
                );
            }
        });
    }

    return orders.length;
}

module.exports = {
    expirePendingOrders
};
