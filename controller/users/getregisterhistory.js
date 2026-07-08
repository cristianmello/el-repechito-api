// getRegisterHistory.js
const { Op } = require('sequelize');
const RegisterLog = require('../../models/registerlog');
const User = require('../../models/user');

const getRegisterHistory = async (req, res) => {
  try {
    const { user_code, user_mail, from, to, page = 1, limit = 10 } = req.query;

    const where = {};

    if (user_code) where.user_code = parseInt(user_code, 10);
    if (user_mail) where.user_mail = { [Op.like]: `%${user_mail}%` };

    if (from || to) {
      where.register_time = {};
      if (from) where.register_time[Op.gte] = new Date(from);
      if (to) where.register_time[Op.lte] = new Date(to);
    }

    const parsedLimit = Math.max(parseInt(limit, 10), 1);
    const parsedPage = Math.max(parseInt(page, 10), 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const logs = await RegisterLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_code', 'user_name', 'user_mail']
        }
      ],
      limit: parsedLimit,
      offset,
      order: [['register_time', 'DESC']]
    });

    return res.json({
      total: logs.count,
      page: parsedPage,
      totalPages: Math.ceil(logs.count / parsedLimit),
      logs: logs.rows
    });
  } catch (error) {
    console.error('Error al obtener historial de registros:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
};

module.exports = getRegisterHistory;
