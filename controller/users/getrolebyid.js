const Role = require('../../models/role');
const redisClient = require('../../services/redisclient');

const getRoleById = async (req, res) => {
    try {
        const role_code = Number(req.params.role_code);

        if (!Number.isInteger(role_code) || role_code <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de rol inválido.'
            });
        }

        // Cache opcional
        if (redisClient) {
            const cached = await redisClient.get(`role_${role_code}`);
            if (cached) {
                return res.json({
                    status: 'success',
                    data: JSON.parse(cached)
                });
            }
        }

        const role = await Role.findByPk(role_code, {
            attributes: ['role_code', 'role_name', 'role_description']
        });

        if (!role) {
            return res.status(404).json({
                status: 'error',
                message: 'Rol no encontrado.'
            });
        }

        if (redisClient) {
            await redisClient.set(
                `role_${role_code}`,
                JSON.stringify(role),
                'EX',
                60 * 60
            );
        }

        return res.json({
            status: 'success',
            data: role
        });

    } catch (error) {
        console.error(`[getRoleById] Error rol ${req.params.role_code}:`, error);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor.'
        });
    }
};

module.exports = getRoleById;
