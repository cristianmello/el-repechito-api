const axios = require('axios');

const MP_BASE_URL = 'https://api.mercadopago.com';

async function getPayment(paymentId) {
    const { data } = await axios.get(
        `${MP_BASE_URL}/v1/payments/${paymentId}`,
        {
            headers: {
                Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
            }
        }
    );
    return data;
}

module.exports = {
    charge,
    refund,
    getPayment
};
