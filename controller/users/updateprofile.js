const User = require('../../models/user');
const ProfileChangeLog = require('../../models/profilechangelog');

const updateProfile = async (req, res) => {
  const t = await User.sequelize.transaction();

  try {
    const user_code = req.user.id;
    const changed_by = user_code; // preparado para admins en el futuro

    const fieldsToUpdate = ['user_name', 'user_lastname', 'user_birth', 'user_phone'];
    const updates = {};

    for (const field of fieldsToUpdate) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];

        if (typeof value === 'string') {
          value = value.trim();
          if (value.length > 255) {
            return res.status(400).json({
              status: 'error',
              message: `El campo ${field} es demasiado largo.`
            });
          }
        }

        updates[field] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      await t.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'No se enviaron campos válidos para actualizar.'
      });
    }

    const user = await User.findByPk(user_code, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado.'
      });
    }

    const changeLogs = [];

    for (const field of fieldsToUpdate) {
      if (updates[field] !== undefined) {
        const oldVal = user[field];
        const newVal = updates[field];

        const normalizedOld = typeof oldVal === 'string' ? oldVal.trim() : oldVal;
        const normalizedNew = typeof newVal === 'string' ? newVal.trim() : newVal;

        if (normalizedOld !== normalizedNew) {
          changeLogs.push({
            user_code,
            changed_by,
            field,
            old_value: oldVal !== null ? String(oldVal) : null,
            new_value: newVal !== null ? String(newVal) : null,
            changed_at: new Date()
          });

          user[field] = newVal;
        }
      }
    }

    if (changeLogs.length === 0) {
      await t.rollback();
      return res.status(400).json({
        status: 'error',
        message: 'No se detectaron cambios en el perfil.'
      });
    }

    await user.save({ transaction: t });

    try {
      await ProfileChangeLog.bulkCreate(changeLogs, { transaction: t });
    } catch (logErr) {
      console.warn('[updateProfile] Perfil actualizado pero falló el log:', logErr);
      // intencionalmente no abortamos
    }

    await t.commit();

    return res.json({
      status: 'success',
      message: 'Perfil actualizado correctamente.',
      changes_logged: changeLogs.length
    });

  } catch (error) {
    await t.rollback();
    console.error('[updateProfile] Error inesperado:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor.'
    });
  }
};

module.exports = updateProfile;
