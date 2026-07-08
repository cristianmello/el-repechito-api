const { Op } = require('sequelize');
const PasswordResetLog = require('../../models/forgotpasswordlog');
const User = require('../../models/user');

const getForgotPasswordHistory = async (req, res) => {
  try {
    const { user_code, user_mail, from, to, page = 1, limit = 10 } = req.query;

    const where = {};

    if (user_code) where.user_code = parseInt(user_code, 10);
    if (user_mail) where.user_mail = { [Op.like]: `%${user_mail}%` };

    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }

    const parsedLimit = Math.max(parseInt(limit), 1);
    const parsedPage = Math.max(parseInt(page), 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const logs = await PasswordResetLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_code', 'user_name']
        }
      ],
      limit: parsedLimit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return res.json({
      total: logs.count,
      page: parsedPage,
      totalPages: Math.ceil(logs.count / parsedLimit),
      logs: logs.rows
    });
  } catch (error) {
    console.error('Error al obtener historial de recuperación de contraseña:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
};

module.exports = getForgotPasswordHistory;
