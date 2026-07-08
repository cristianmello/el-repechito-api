const { Op } = require('sequelize');
const PasswordResetLog = require('../../models/forgotpasswordlog');
const User = require('../../models/user');
const { Parser } = require('json2csv');

const getForgotPasswordHistoryCSV = async (req, res) => {
    try {
        const { user_code, user_mail, from, to } = req.query;

        const where = {};

        if (user_code) where.user_code = parseInt(user_code, 10);
        if (user_mail) where.user_mail = { [Op.like]: `%${user_mail}%` };
        if (from || to) {
            where.created_at = {
                ...(from && { [Op.gte]: new Date(from) }),
                ...(to && { [Op.lte]: new Date(to) })
            };
        }

        const logs = await PasswordResetLog.findAll({
            where,
            limit: 10000,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['user_code', 'user_name', 'user_mail']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        if (!logs.length) {
            return res.status(404).json({ message: 'No se encontraron registros de recuperación de contraseña' });
        }

        const mapped = logs.map(log => ({
            Usuario: `${log.user?.user_name || 'Desconocido'} (${log.user?.user_mail || 'N/A'})`,
            'Correo usado': log.user_mail,
            'IP de origen': log.ip_address,
            'Navegador': log.user_agent,
            'Fecha de solicitud': log.created_at.toLocaleString('es-AR')
        }));

        const parser = new Parser();
        const csv = parser.parse(mapped);

        const today = new Date().toISOString().split('T')[0];
        const fileName = `solicitudes-recuperacion-${today}.csv`;

        res.header('Content-Type', 'text/csv');
        res.attachment(fileName);
        return res.send(csv);
    } catch (error) {
        console.error('Error al exportar CSV de recuperación:', error);
        res.status(500).json({ message: 'Error interno del servidor al generar el CSV' });
    }
};

module.exports = getForgotPasswordHistoryCSV;
