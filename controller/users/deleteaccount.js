// controllers/deleteAccount.js
const User = require('../../models/user');
const Role = require('../../models/role');

// Jerarquía de roles (nombres en minúscula)
const roleHierarchy = {
  user: 1,
  editor: 2,
  admin: 3,
  superadmin: 4
};

const deleteAccount = async (req, res) => {
  try {
    const param = req.params.user_code;
    const targetUserCode = parseInt(param, 10);
    if (Number.isNaN(targetUserCode)) {
      return res.status(400).json({ status: 'error', message: 'user_code inválido' });
    }

    // req.user debe venir del middleware verifyToken y contener user_code (no `id`)
    const requesterUserCode = req.user?.user_code;
    if (!requesterUserCode) {
      return res.status(401).json({ status: 'error', message: 'No autenticado' });
    }

    const isSelfDelete = requesterUserCode === targetUserCode;

    // Traer usuario objetivo con su rol
    const userToDelete = await User.findByPk(targetUserCode, {
      include: {
        model: Role,
        as: 'role',
        attributes: ['role_code', 'role_name']
      }
    });

    if (!userToDelete) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
    }

    // Obtener rol del que solicita la eliminación.
    // Intentamos tomarlo de req.user.role_code (si el middleware lo puso),
    // si no, lo buscamos en BD para tener el role_name.
    let requesterRoleName = null;
    if (req.user.role_code) {
      const r = await Role.findByPk(req.user.role_code);
      requesterRoleName = r?.role_name || null;
    } else {
      const requester = await User.findByPk(requesterUserCode, {
        include: { model: Role, as: 'role', attributes: ['role_name'] }
      });
      requesterRoleName = requester?.role?.role_name || null;
    }

    const targetRoleName = userToDelete.role?.role_name || null;

    // Normalizar y calcular niveles (fallback a 0 si no está en roleHierarchy)
    const requesterLevel = (requesterRoleName && roleHierarchy[requesterRoleName.toLowerCase()]) || 0;
    const targetLevel = (targetRoleName && roleHierarchy[targetRoleName.toLowerCase()]) || 0;

    // Reglas:
    // - Si es self-delete: permitir siempre (se asume que el usuario puede borrar su cuenta)
    // - Si no es self-delete: el requester debe tener strictly mayor jerarquía (>) que el objetivo
    if (!isSelfDelete && requesterLevel <= targetLevel) {
      return res.status(403).json({
        status: 'error',
        message: `No puedes eliminar a un usuario con rol igual o superior ("${targetRoleName || 'sin rol'}").`
      });
    }


    // Verificar que no sea el último admin  
    if (targetRoleName === 'admin' || targetRoleName === 'superadmin') {
      const adminCount = await User.count({
        where: {
          role_code: userToDelete.role_code
        }
      });

      if (adminCount <= 1) {
        return res.status(403).json({
          status: 'error',
          message: 'No puedes eliminar al último administrador del sistema.'
        });
      }
    }
    await userToDelete.destroy();

    return res.json({ status: 'success', message: 'Cuenta eliminada correctamente.' });
  } catch (err) {
    console.error('[DeleteAccount]', err);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
  }
};

module.exports = deleteAccount;
