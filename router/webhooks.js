const express = require('express');
const router = express.Router();

const mercadopagoWebhook = require('../controller/webhooks/mercadopago');

router.post(
    '/mercadopago',
    express.json({
        verify: (req, res, buf) => {
            req.rawBody = buf;
        }
    }),
    mercadopagoWebhook
);

module.exports = router;
