// services/stock.service.js
const Product = require('../models/product');
const OrderItem = require('../models/orderitem');

/**
 * Restaura stock de una orden completa
 * (idempotente)
 */
async function restoreStockFromOrder(orderCode, transaction = null) {
    const items = await OrderItem.findAll({
        where: { order_code: orderCode },
        transaction
    });

    for (const item of items) {
        await Product.increment(
            { stock: item.quantity },
            {
                where: { product_code: item.product_code },
                transaction
            }
        );
    }
}

module.exports = {
    restoreStockFromOrder
};
