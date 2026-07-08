const redisClient = require('../../services/redisclient');

const revokeRefreshToken = async (req, res) => {
  const { jti } = req.body;

  if (!jti) {
    return res.status(400).json({
      status: 'error',
      message: 'Falta el identificador del token (jti).',
    });
  }

  try {
    // Revocar el token por 30 días (TTL igual a duración del refresh token)
    await redisClient.set(`bl_rt_${jti}`, 'true', 'EX', 60 * 60 * 24 * 30);

    res.json({
      status: 'success',
      message: 'Refresh token revocado correctamente.',
    });
  } catch (err) {
    console.error('[RevokeRefreshToken]', err);
    res.status(500).json({
      status: 'error',
      message: 'Error al revocar el refresh token.',
    });
  }
};

module.exports = revokeRefreshToken;
