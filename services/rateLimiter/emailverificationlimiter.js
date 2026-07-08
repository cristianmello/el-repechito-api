// services/rateLimiter/EmailVerificationLimiter.js
const redisClient = require('../redisclient');
const WINDOW_SECONDS = 60 * 60; // 1 hora
const MAX_REQUESTS = 3;         // máximo 3 envíos por hora

module.exports = {
  emailVerificationLimiter: async (req, res, next) => {
    const identifier = req.body?.user_mail || req.ip;
    const key = `rl_verify_${identifier}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      const data = await redisClient.hgetall(key);

      // ventana nueva
      if (!data.count || (now - parseInt(data.firstAt, 10)) > WINDOW_SECONDS) {
        await redisClient
          .multi()
          .hset(key, { count: 1, firstAt: now })
          .expire(key, WINDOW_SECONDS)
          .exec();
        return next();
      }

      const count = parseInt(data.count, 10);
      if (count >= MAX_REQUESTS) {
        return res.status(429).json({
          status: 'error',
          message: 'Has alcanzado el límite de envíos de verificación. Intenta más tarde.',
        });
      }

      await redisClient
        .multi()
        .hincrby(key, 'count', 1)
        .exec();
      return next();
    } catch (err) {
      console.error('[EmailVerificationLimiter] Error:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Error interno al procesar la solicitud.',
      });
    }
  }
};
