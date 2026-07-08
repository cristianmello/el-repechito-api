// Importamos el modelo de Role
const Role = require('../../models/role');

/**
 * Controlador para obtener una lista de todos los roles disponibles en el sistema.
 * Es una consulta simple, sin paginación, ideal para rellenar menús desplegables.
 */
const getAllRoles = async (req, res) => {
    try {
        // Buscamos todos los roles en la base de datos
        const roles = await Role.findAll({
            // Especificamos los atributos que queremos devolver para que sea más eficiente
            attributes: ['role_code', 'role_name', 'role_description'],
            
            order: [
                ['role_name', 'ASC']
            ]
        });

        // Enviamos una respuesta exitosa con la lista de roles
        return res.status(200).json({
            status: 'success',
            message: 'Roles obtenidos correctamente.',
            roles: roles // El array de roles
        });

    } catch (error) {
        // Manejamos cualquier error que pueda ocurrir durante la consulta
        console.error('[getAllRoles] Error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error del servidor al obtener los roles.'
        });
    }
};

// Exportamos el controlador para poder usarlo en el archivo de rutas
module.exports = getAllRoles;