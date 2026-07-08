const redisClient = require('../redisclient');

const MAX_REQUESTS_PER_DAY = 4;

module.exports = {
    rateLimiter: async (req, res, next) => {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                status: 'error',
                message: 'Usuario no autenticado.',
            });
        }

        const today = new Date().toISOString().slice(0, 10);
        const key = `rate:user:${userId}:update:${today}`;

        try {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setUTCHours(24, 0, 0, 0); // próximo día a las 00:00 UTC
            const secondsUntilMidnight = Math.floor((midnight - now) / 1000);
            const hours = Math.floor(secondsUntilMidnight / 3600);
            const minutes = Math.floor((secondsUntilMidnight % 3600) / 60);
            const resetIn = `${hours}h ${minutes}m`;

            // Establecer siempre el header con tiempo restante
            res.set('X-RateLimit-Reset-In', resetIn);

            const currentCount = await redisClient.get(key);
            if (currentCount && parseInt(currentCount) >= MAX_REQUESTS_PER_DAY) {
                return res.status(429).json({
                    status: 'error',
                    message: `Has alcanzado el límite diario de actualizaciones (${MAX_REQUESTS_PER_DAY}). Intenta nuevamente mañana.`,
                    retry_after: resetIn
                });
            }

            const newCount = await redisClient.incr(key);
            if (newCount === 1) {
                await redisClient.expire(key, secondsUntilMidnight);
            }

            if (MAX_REQUESTS_PER_DAY - newCount === 1) {
                res.set('X-RateLimit-Warning', 'Última actualización disponible para hoy.');
            }

            return next();
        } catch (err) {
            console.error('[UpdateProfileLimiter] Error:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Error interno del servidor.',
            });
        }
    },
};
