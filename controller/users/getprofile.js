// controllers/users/getProfile.js
const User = require('../../models/user');
const Role = require('../../models/role');

const getProfile = async (req, res) => {
  try {
    // usar user_code (middleware verifyToken debe exponerlo)
    const user = await User.findByPk(req.user.user_code, {
      attributes: { exclude: ['user_password'] },
      include: [{ model: Role, as: 'role', attributes: ['role_name', 'role_code'] }]
    });

    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });

    return res.json({ status: 'success', data: user });
  } catch (error) {
    console.error('[getProfile] Error:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
  }
};

module.exports = getProfile;
