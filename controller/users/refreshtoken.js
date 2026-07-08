const User = require('../../models/user');
const jwt = require('jsonwebtoken');
const redisClient = require('../../services/redisclient');
const { createToken, createRefreshToken } = require('../../services/jwt');

const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refresh_token;
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token requerido.'
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token inválido o expirado.'
      });
    }

    // 1️⃣ Verificar blacklist
    const isRevoked = await redisClient.get(`bl_rt_${payload.jti}`);
    if (isRevoked === 'true') {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token revocado.'
      });
    }

    // 2️⃣ Buscar usuario
    const user = await User.findByPk(payload.sub, {
      attributes: ['user_code', 'user_mail', 'role_code'],
      include: [{ association: 'role', attributes: ['role_name'] }]
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado.'
      });
    }

    // 3️⃣ Verificar whitelist
    const isWhitelisted = await redisClient.sismember(
      `rtls_${user.user_code}`,
      payload.jti
    );

    if (!isWhitelisted) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token no reconocido.'
      });
    }

    // 4️⃣ Revocar refresh token actual
    await redisClient.set(
      `bl_rt_${payload.jti}`,
      'true',
      'EX',
      60 * 60 * 24 * 30
    );
    await redisClient.srem(`rtls_${user.user_code}`, payload.jti);

    // 5️⃣ Generar nuevos tokens
    const newAccessToken = createToken(user);
    const newRefreshToken = createRefreshToken(user);

    const { jti: newJti } = jwt.decode(newRefreshToken);

    await redisClient.sadd(`rtls_${user.user_code}`, newJti);
    await redisClient.expire(
      `rtls_${user.user_code}`,
      60 * 60 * 24 * 30
    );

    // 6️⃣ Limitar máximo 5 sesiones
    const allJtis = await redisClient.smembers(`rtls_${user.user_code}`);
    if (allJtis.length > 5) {
      const jtisToRemove = allJtis.slice(0, allJtis.length - 5);
      for (const jti of jtisToRemove) {
        await redisClient.srem(`rtls_${user.user_code}`, jti);
        await redisClient.set(
          `bl_rt_${jti}`,
          'true',
          'EX',
          60 * 60 * 24 * 30
        );
      }
    }

    // 7️⃣ Setear cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain:
        process.env.NODE_ENV === 'production'
          ? '.realidadnacional.net'
          : undefined,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30
    });

    if (req.csrfToken) {
      res.cookie('XSRF-TOKEN', req.csrfToken(), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        domain:
          process.env.NODE_ENV === 'production'
            ? '.realidadnacional.net'
            : undefined,
        path: '/'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Tokens renovados correctamente.',
      token: newAccessToken
    });
  } catch (err) {
    console.error('[refreshToken]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno al renovar tokens.'
    });
  }
};

module.exports = refreshToken;
