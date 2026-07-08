const cron = require('node-cron');
const { expirePendingOrders } = require('../services/orderExpiration.service');

function startOrderExpirationJob() {
    // ⏱️ cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
        try {
            const expired = await expirePendingOrders(30);
            if (expired > 0) {
                console.log(`🕒 Órdenes expiradas: ${expired}`);
            }
        } catch (err) {
            console.error('❌ Error expirando órdenes:', err);
        }
    });
}

module.exports = startOrderExpirationJob;
