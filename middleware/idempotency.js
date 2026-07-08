const redisClient = require('../services/redisclient');
const crypto = require('crypto');

module.exports = async (req, res, next) => {
    if (!redisClient) return next();

    const headerKey = req.headers['idempotency-key'];

    // Si no viene header, generamos hash del body
    const key = headerKey
        ? String(headerKey)
        : crypto
            .createHash('sha256')
            .update(JSON.stringify(req.body))
            .digest('hex');

    const redisKey = `idem:${req.method}:${req.originalUrl}:${key}`;

    try {
        const cached = await redisClient.get(redisKey);

        // 🔁 Request duplicado
        if (cached) {
            const parsed = JSON.parse(cached);
            return res.status(parsed.status).json(parsed.body);
        }

        // 🧠 Hookeamos res.json
        const originalJson = res.json.bind(res);

        res.json = (body) => {
            redisClient.setex(
                redisKey,
                600, // 10 minutos
                JSON.stringify({
                    status: res.statusCode,
                    body
                })
            );
            return originalJson(body);
        };

        next();
    } catch (err) {
        console.error('[Idempotency]', err);
        next(); // fail-safe
    }
};
