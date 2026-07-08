// services/rateLimiter/ForgotPasswordLimiter.js
const redisClient = require('../redisclient');
const WINDOW_SECONDS = 60 * 60;
const MAX_REQUESTS = 3;

module.exports = {
  forgotPasswordLimiter: async (req, res, next) => {
    const identifier = req.body?.user_mail || req.ip;
    const key = `fp_${identifier}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      const data = await redisClient.hgetall(key);

      // Primera petición o ventana expirada
      if (!data.count || (now - parseInt(data.createdAt, 10)) > WINDOW_SECONDS) {
        await redisClient
          .multi()
          .hset(key, { count: 1, createdAt: now })
          .expire(key, WINDOW_SECONDS)
          .exec();
        return next();
      }

      const count = parseInt(data.count, 10);

      // Si ya superó el límite
      if (count >= MAX_REQUESTS) {
        const ttl = await redisClient.ttl(key);
        res.set('Retry-After', ttl);
        return res.status(429).json({
          status: 'error',
          message: `Demasiadas solicitudes. Intenta nuevamente en ${ttl} segundos.`,
        });
      }

      // Incrementar contador y refrescar TTL
      await redisClient
        .multi()
        .hincrby(key, 'count', 1)
        .expire(key, WINDOW_SECONDS)
        .exec();

      return next();
    } catch (err) {
      console.error('[ForgotPasswordLimiter] Error:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor.',
      });
    }
  }
};
