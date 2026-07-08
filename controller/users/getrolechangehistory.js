const { Op } = require('sequelize');
const RoleChangeLog = require('../../models/rolechangelog');
const User = require('../../models/user');
const Role = require('../../models/role');

const getRoleChangeHistory = async (req, res) => {
  try {
    const { user_code, changed_by, from, to, page = 1, limit = 10 } = req.query;

    const where = {};

    if (user_code) where.user_code = parseInt(user_code, 10);
    if (changed_by) where.changed_by = parseInt(changed_by, 10);

    if (from || to) {
      where.changed_at = {};
      if (from) where.changed_at[Op.gte] = new Date(from);
      if (to) where.changed_at[Op.lte] = new Date(to);
    }

    const parsedLimit = Math.max(parseInt(limit), 1);
    const parsedPage = Math.max(parseInt(page), 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const logs = await RoleChangeLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          // Se añade 'user_mail' a la consulta
          attributes: ['user_code', 'user_name', 'user_mail']
        },
        {
          model: User,
          as: 'changer',
          // Se añade 'user_mail' a la consulta
          attributes: ['user_code', 'user_name', 'user_mail']
        },
        { model: Role, as: 'oldRole', attributes: ['role_name'] },
        { model: Role, as: 'newRole', attributes: ['role_name'] }
      ],
      limit: parsedLimit,
      offset: offset,
      order: [['changed_at', 'DESC']]
    });

    return res.json({
      total: logs.count,
      page: parsedPage,
      totalPages: Math.ceil(logs.count / parsedLimit),
      logs: logs.rows
    });
  } catch (error) {
    console.error('Error al obtener historial de roles:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
};

module.exports = getRoleChangeHistory;