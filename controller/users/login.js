const { createToken, createRefreshToken } = require('../../services/jwt');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const redisClient = require('../../services/redisclient');
const User = require('../../models/user');
const LoginLog = require('../../models/loginlog');

const login = async (req, res) => {
  const { user_mail, user_password } = req.body;

  try {
    const user = await User.findOne({
      where: { user_mail },
      attributes: [
        'user_code',
        'user_mail',
        'user_password',
        'role_code',
        'is_verified'
      ],
      include: [{ association: 'role', attributes: ['role_name'] }]
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales inválidas.'
      });
    }

    const match = await bcrypt.compare(user_password, user.user_password);
    if (!match) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales inválidas.'
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_NOT_VERIFIED',
        message: 'Su cuenta no ha sido verificada.'
      });
    }

    // Crear tokens
    const accessToken = createToken(user);
    const refreshToken = createRefreshToken(user);

    // Guardar refresh token en whitelist (Redis)
    const decodedRefresh = jwt.decode(refreshToken);
    const jti = decodedRefresh.jti;

    await redisClient.sadd(`rtls_${user.user_code}`, jti);
    await redisClient.expire(`rtls_${user.user_code}`, 60 * 60 * 24 * 30); // 30 días

    // Limitar a 5 sesiones activas
    const allJtis = await redisClient.smembers(`rtls_${user.user_code}`);
    if (allJtis.length > 5) {
      const jtisToRemove = allJtis.slice(0, allJtis.length - 5);
      for (const oldJti of jtisToRemove) {
        await redisClient.srem(`rtls_${user.user_code}`, oldJti);
        await redisClient.set(
          `bl_rt_${oldJti}`,
          'true',
          'EX',
          60 * 60 * 24 * 30
        );
      }
    }

    // Cookie del refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain:
        process.env.NODE_ENV === 'production'
          ? '.realidadnacional.net'
          : undefined,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30 // 30 días
    });

    // Cookie CSRF (si aplica)
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

    // Log de login
    try {
      await LoginLog.create({
        user_code: user.user_code,
        user_mail: user.user_mail,
        ip_address: req.ip || null,
        user_agent: req.get('User-Agent') || null
      });
    } catch (logError) {
      console.error('[LoginLog]', logError);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Inicio de sesión exitoso.',
      token: accessToken
    });
  } catch (err) {
    console.error('[Auth][Login]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor.'
    });
  }
};

module.exports = login;
