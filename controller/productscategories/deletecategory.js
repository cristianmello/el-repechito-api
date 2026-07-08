// src/controllers/categories/deleteCategory.js
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
  const { id } = req.params;
  const t = await Category.sequelize.transaction();

  try {
    const category = await Category.findByPk(id, { transaction: t });

    if (!category) {
      await t.rollback();
      return res.status(404).json({
        status: 'error',
        message: 'Categoría no encontrada.',
      });
    }

    await category.destroy({ transaction: t });
    await t.commit();

    // 🔥 Cache relevante SOLO para almacén
    await Promise.all([
      clearCacheByPattern('categories:*'),
      clearCacheByPattern('products:*'),
      clearCacheByPattern(`category:${id}`)
    ]);

    return res.status(200).json({
      status: 'success',
      message: 'Categoría eliminada correctamente.',
    });

  } catch (error) {
    await t.rollback();
    console.error('[Categories][Delete]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al eliminar la categoría.',
    });
  }
};
