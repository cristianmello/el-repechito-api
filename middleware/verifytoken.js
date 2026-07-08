// middlewares/verifyToken.js
const jwt = require('jsonwebtoken');
const redisClient = require('../services/redisclient'); // puede ser stub o cliente real

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_TOKEN_SECRET) {
  throw new Error('[verifyToken] Falta ACCESS_TOKEN_SECRET');
}

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // Si existiera Redis y el método get, comprobamos revocación.
    if (redisClient && typeof redisClient.get === 'function') {
      try {
        const isRevoked = await redisClient.get(`bl_at_${decoded.jti}`);
        if (isRevoked === 'true') {
          return res.status(403).json({ status: 'error', message: 'Token revocado' });
        }
      } catch (redisErr) {
        // No fallar si Redis da problemas — logueamos y seguimos
        console.warn('[verifyToken] Redis error al comprobar revocación:', redisErr.message || redisErr);
      }
    }

    // Dejamos en req.user SOLO lo mínimo para autorizar: ids
    req.user = {
      user_code: decoded.sub,
      role_code: decoded.role_code || null,
      tokenId: decoded.jti || null
    };

    return next();
  } catch (err) {
    // Token expirado -> 401, otro problema -> 401 (simplificado)
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token expirado' });
    }
    return res.status(401).json({ status: 'error', message: 'Token inválido' });
  }
}

module.exports = verifyToken;
