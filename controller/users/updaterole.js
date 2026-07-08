const User = require('../../models/user');
const Role = require('../../models/role');
const RoleChangeLog = require('../../models/rolechangelog'); // Importar el modelo de log

const changeUserRole = async (req, res) => {
    try {
        const user_code = parseInt(req.params.user_code, 10);
        const { new_role_code } = req.body;
        const changed_by = req.user.id;

        if (!user_code || !new_role_code) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: user_code o new_role_code' });
        }

        const user = await User.findByPk(user_code);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        if (user.role_code === new_role_code) {
            return res.status(400).json({ message: 'El usuario ya tiene asignado ese rol' });
        }
        
        const role = await Role.findByPk(new_role_code);
        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        const old_role_code = user.role_code;

        // Actualizar el rol
        user.role_code = new_role_code;
        await user.save();

        // Registrar el cambio en el log
        await RoleChangeLog.create({
            user_code,
            old_role_code,
            new_role_code,
            changed_by,
            changed_at: new Date()
        });

        return res.status(200).json({
            message: `Rol del usuario actualizado correctamente a '${role.role_name}'`,
            user: {
                user_code: user.user_code,
                new_role_code: role.role_code,
                new_role_name: role.role_name
            }
        });
    } catch (error) {
        console.error('Error al cambiar rol:', error);
        return res.status(500).json({ message: 'Error del servidor al intentar cambiar el rol' });
    }
};

module.exports = changeUserRole