const { validationResult } = require('express-validator');
const Category = require('../../models/category');
const redisClient = require('../../services/redisclient');

async function clearCacheByPattern(pattern) {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redisClient.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100
    );
    if (keys.length) await redisClient.del(...keys);
    cursor = nextCursor;
  } while (cursor !== '0');
}

module.exports = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  const { category_name, category_slug, is_active } = req.body;

  const t = await Category.sequelize.transaction();

  try {
    const category = await Category.findByPk(id, { transaction: t });
    if (!category) {
      await t.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Categoría no encontrada.'
      });
    }

    // Validar slug único
    if (category_slug && category_slug !== category.category_slug) {
      const exists = await Category.findOne({
        where: { category_slug },
        transaction: t
      });

      if (exists && exists.category_code !== category.category_code) {
        await t.rollback();
        return res.status(409).json({
          status: 'error',
          message: 'El slug ya está en uso.'
        });
      }
    }

    await category.update(
      {
        category_name,
        category_slug,
        is_active
      },
      { transaction: t }
    );

    await t.commit();

    // 🔥 Invalidación SOLO de caché de almacén
    await Promise.all([
      clearCacheByPattern('inventory:categories:*'),
      clearCacheByPattern(`inventory:category:${id}`),
      clearCacheByPattern('inventory:products:*')
    ]);

    return res.status(200).json({
      status: 'success',
      message: 'Categoría actualizada correctamente.',
      category
    });

  } catch (error) {
    await t.rollback();
    console.error('[Inventory][Categories][Update]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al actualizar la categoría.'
    });
  }
};
