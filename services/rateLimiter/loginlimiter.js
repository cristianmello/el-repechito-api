// services/rateLimiter/LoginLimiter.js
const redisClient = require('../redisclient');
const RATELIMIT_DURATION = 5 * 60; // segundos
const MAX_REQUESTS = 5;

module.exports = {
  rateLimiter: async (req, res, next) => {
    // Identificador único: email, user_id o IP
    const identifier = req.body?.user_mail || req.headers['user_id'] || req.ip;
    const now = Math.floor(Date.now() / 1000);

    try {
      const data = await redisClient.hgetall(identifier);

      // Primera petición o ventana expirada
      if (!data.count || (now - parseInt(data.createdAt, 10)) > RATELIMIT_DURATION) {
        await redisClient
          .multi()
          .hset(identifier, { count: 1, createdAt: now })
          .expire(identifier, RATELIMIT_DURATION)
          .exec();
        return next();
      }

      const count = parseInt(data.count, 10);

      if (count >= MAX_REQUESTS) {
        return res.status(429).json({
          status: 'error',
          message: 'Demasiados intentos. Intenta de nuevo más tarde.',
        });
      }

      // Incrementar contador y refrescar TTL
      await redisClient
        .multi()
        .hincrby(identifier, 'count', 1)
        .expire(identifier, RATELIMIT_DURATION)
        .exec();

      return next();
    } catch (err) {
      console.error('[RateLimiter] Error:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor.',
      });
    }
  },
};
