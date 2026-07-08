const { Op } = require('sequelize');
const ProfileChangeLog = require('../../models/profilechangelog');
const User = require('../../models/user');
const { Parser } = require('json2csv');

const GetProfileChangeHistoryCSV = async (req, res) => {
    try {
        const { user_code, from, to } = req.query;

        const where = {};
        if (user_code) where.user_code = user_code;
        if (from || to) {
            where.changed_at = {
                ...(from && { [Op.gte]: new Date(from) }),
                ...(to && { [Op.lte]: new Date(to) })
            };
        }

        const changes = await ProfileChangeLog.findAll({
            where,
            limit: 10000,
            include: [
                { model: User, as: 'user', attributes: ['user_code', 'user_name', 'user_mail'] },
                { model: User, as: 'editor', attributes: ['user_name'] }
            ],
            order: [['changed_at', 'DESC']]
        });

        if (!changes.length) {
            return res.status(404).json({ message: 'No se encontraron cambios de perfil' });
        }

        const mapped = changes.map(change => ({
            Usuario: `${change.user.user_name} (${change.user.user_mail})`,
            Campo: change.field,
            'Valor anterior': change.old_value,
            'Nuevo valor': change.new_value,
            'Modificado por': change.editor?.user_name || 'N/A',
            'Fecha de cambio': change.changed_at.toLocaleString('es-AR')
        }));

        const parser = new Parser();
        const csv = parser.parse(mapped);

        const today = new Date().toISOString().split('T')[0];
        const fileName = `historial-cambios-perfil-${today}.csv`;

        res.header('Content-Type', 'text/csv');
        res.attachment(fileName);
        return res.send(csv);
    } catch (error) {
        console.error('Error al exportar CSV de perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor al generar el CSV' });
    }
};

module.exports = GetProfileChangeHistoryCSV;
