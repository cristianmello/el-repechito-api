const { Op } = require('sequelize');
const LoginLog = require('../../models/loginlog');
const User = require('../../models/user');
const { Parser } = require('json2csv');

const getLoginHistoryCSV = async (req, res) => {
    try {
        const { user_code, user_mail, from, to } = req.query;

        const where = {};

        if (user_code) where.user_code = parseInt(user_code, 10);
        if (user_mail) where.user_mail = { [Op.like]: `%${user_mail}%` };
        if (from || to) {
            where.login_time = {
                ...(from && { [Op.gte]: new Date(from) }),
                ...(to && { [Op.lte]: new Date(to) }),
            };
        }

        const logs = await LoginLog.findAll({
            where,
            limit: 10000,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['user_code', 'user_name', 'user_mail']
                }
            ],
            order: [['login_time', 'DESC']]
        });

        if (!logs.length) {
            return res.status(404).json({ message: 'No se encontraron registros de inicio de sesión' });
        }

        const mapped = logs.map(log => ({
            Usuario: `${log.user?.user_name || 'Desconocido'} (${log.user?.user_mail || 'N/A'})`,
            'Correo usado': log.user_mail,
            'IP de origen': log.ip_address || 'N/A',
            Navegador: log.user_agent || 'N/A',
            'Fecha de inicio de sesión': log.login_time.toLocaleString('es-AR')
        }));

        const parser = new Parser();
        const csv = parser.parse(mapped);

        const today = new Date().toISOString().split('T')[0];
        const fileName = `historial-logins-${today}.csv`;

        res.header('Content-Type', 'text/csv');
        res.attachment(fileName);
        return res.send(csv);
    } catch (error) {
        console.error('Error al exportar CSV de historial de login:', error);
        res.status(500).json({ message: 'Error interno del servidor al generar el CSV' });
    }
};

module.exports = getLoginHistoryCSV;
