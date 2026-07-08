const bcrypt = require('bcryptjs');
const User = require('../../models/user');

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.scope('withPassword').findByPk(req.user.user_code);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'Usuario no encontrado'
    });
  }

  const match = await bcrypt.compare(oldPassword, user.user_password);
  if (!match) {
    return res.status(401).json({
      status: 'error',
      message: 'Contraseña actual incorrecta'
    });
  }

  // 👉 IMPORTANTE: sin hash manual
  user.user_password = newPassword;
  await user.save(); // el hook beforeUpdate hace el hash

  res.json({
    status: 'success',
    message: 'Contraseña cambiada correctamente'
  });
};

module.exports = changePassword;
