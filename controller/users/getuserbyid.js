// controllers/users/getUserById.js
const User = require('../../models/user');
const Role = require('../../models/role');

const getUserById = async (req, res) => {
    try {
        const user_code = Number(req.params.user_code);
        if (!Number.isInteger(user_code) || user_code <= 0) {
            return res.status(400).json({ status: 'error', message: 'ID de usuario inválido.' });
        }

        // Buscar en la base de datos
        const user = await User.findByPk(user_code, {
            attributes: [
                'user_code',
                'user_name',
                'user_lastname',
                'user_mail',
                'user_birth',
                'user_phone',
                'user_image',
                'is_vip',
                'is_verified',
                'created_at',
                'updated_at'
            ],
            include: [{
                model: Role,
                as: 'role',
                attributes: ['role_code', 'role_name']
            }]
        });

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }

        return res.status(200).json({ status: 'success', data: user });
    } catch (error) {
        console.error(`[getUserById] Error al obtener usuario ${req.params.user_code}:`, error);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
};

module.exports = getUserById;
