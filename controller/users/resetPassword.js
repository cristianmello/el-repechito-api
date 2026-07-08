const { validationResult } = require('express-validator');
const redisClient = require('../../services/redisclient');
const User = require('../../models/user');
const bcrypt = require('bcryptjs');
const PasswordChangeLog = require('../../models/passwordchangelog');


const resetPassword = async (req, res) => {
  // Validar errores del body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  const { user_password } = req.body;
  const token = req.query.token;

  if (!token) {
    return res.status(400).json({ status: 'error', message: 'Token no proporcionado.' });
  }

  try {
    // Verificar token en Redis
    const userCode = await redisClient.get(`reset_token_${token}`);
    if (!userCode) {
      return res.status(400).json({ status: 'error', message: 'Token inválido o expirado.' });
    }

    // Buscar usuario
    const user = await User.findByPk(userCode);
    if (!user) {
      // Eliminar token para seguridad
      await redisClient.del(`reset_token_${token}`);
      await redisClient.del(`reset_user_${userCode}`);
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
    }

    // Actualizar contraseña
    const hashedPassword = await bcrypt.hash(user_password, 10);
    user.user_password = hashedPassword;
    await user.save();


    // Eliminar tokens de Redis
    await redisClient.del(`reset_token_${token}`);
    await redisClient.del(`reset_user_${userCode}`);

    // Registrar log del cambio de contraseña
    await PasswordChangeLog.create({
      user_code: user.user_code,
      user_mail: user.user_mail,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    return res.json({ status: 'success', message: 'Contraseña actualizada correctamente.' });

  } catch (err) {
    console.error('[resetPassword]', err);
    return res.status(500).json({ status: 'error', message: 'Error del servidor.' });
  }
};

module.exports = resetPassword;
