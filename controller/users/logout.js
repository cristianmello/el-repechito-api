// controllers/users/logout.js
const jwt = require('jsonwebtoken');
const redisClient = require('../../services/redisclient');

const logout = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  const accessToken = req.headers.authorization?.split(' ')[1];

  // Revocar Refresh Token (si existe y Redis disponible)
  if (refreshToken && process.env.REFRESH_TOKEN_SECRET) {
    try {
      const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      if (redisClient && typeof redisClient.set === 'function') {
        await redisClient.set(`bl_rt_${payload.jti}`, 'true', 'EX', 60 * 60 * 24 * 30); // 30d
        if (payload.sub) await redisClient.srem(`rtls_${payload.sub}`, payload.jti);
      }
    } catch (err) {
      console.warn('[logout] Refresh token inválido/expirado, se ignora.');
    }
  }

  // Revocar Access Token (si existe)
  if (accessToken && process.env.ACCESS_TOKEN_SECRET) {
    try {
      const atPayload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      if (redisClient && typeof redisClient.set === 'function') {
        await redisClient.set(`bl_at_${atPayload.jti}`, 'true', 'EX', 60 * 15); // 15 min
      }
    } catch (err) {
      console.warn('[logout] Access token inválido, no se aplicó blacklist.');
    }
  }

  // Limpiar cookie (sin dominio hardcodeado)
  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });

  res.json({ status: 'success', message: 'Sesión cerrada correctamente.' });
};

module.exports = logout;
