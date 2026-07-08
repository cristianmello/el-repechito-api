const { Op, fn, col, where } = require('sequelize');
const User = require('../../models/user');
const Role = require('../../models/role');

const getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            sort = 'user_code',
            dir = 'ASC',
            role_name,
            is_vip,
            is_verified
        } = req.query;

        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
        const offset = (pageInt - 1) * limitInt;

        // Filtros dinámicos
        const userWhere = {
            [Op.and]: []
        };

        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            userWhere[Op.and].push({
                [Op.or]: [
                    where(fn('LOWER', col('user_name')), { [Op.like]: searchTerm }),
                    where(fn('LOWER', col('user_lastname')), { [Op.like]: searchTerm }),
                    where(fn('LOWER', col('user_mail')), { [Op.like]: searchTerm })
                ]
            });
        }

        if (is_vip !== undefined) {
            userWhere[Op.and].push({ is_vip: is_vip === 'true' });
        }

        if (is_verified !== undefined) {
            userWhere[Op.and].push({ is_verified: is_verified === 'true' });
        }

        const include = [{
            model: Role,
            as: 'role',
            attributes: ['role_name'],
            ...(role_name && {
                where: where(fn('LOWER', col('role.role_name')), {
                    [Op.like]: `%${role_name.toLowerCase()}%`
                })
            })
        }];

        const { rows: users, count: total } = await User.findAndCountAll({
            where: userWhere[Op.and].length ? userWhere : undefined,
            attributes: [
                'user_code',
                'user_name',
                'user_lastname',
                'user_birth',
                'user_mail',
                'user_phone',
                'user_image',
                'is_vip',
                'is_verified',
                'created_at',
                'updated_at'
            ],
            include,
            order: [[sort, dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']],
            limit: limitInt,
            offset
        });

        return res.status(200).json({
            status: 'success',
            message: 'Usuarios obtenidos correctamente.',
            data: {
                total,
                page: pageInt,
                limit: limitInt,
                users
            }
        });
    } catch (error) {
        console.error('[getAllUsers] Error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener los usuarios.'
        });
    }
};

module.exports = getAllUsers;
