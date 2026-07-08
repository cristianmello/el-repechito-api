const { validationResult } = require('express-validator');
const Category = require('../../models/category');
const redisClient = require('../../services/redisclient');

// Utilidad para limpiar cache sin bloquear Redis
async function clearCacheByPattern(pattern) {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      if (keys.length) {
        await redisClient.del(...keys);
      }
      cursor = nextCursor;
    } while (cursor !== '0');
  } catch (e) {
    console.warn(`[Cache] Error limpiando el patrón "${pattern}":`, e);
  }
}

module.exports = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Errores de validación',
      errors: errors.array(),
    });
  }

  const { category_name, category_slug, description } = req.body;
  const t = await Category.sequelize.transaction();

  try {
    // Validar slug único
    const existing = await Category.findOne({
      where: { category_slug },
      transaction: t,
    });

    if (existing) {
      await t.rollback();
      return res.status(409).json({
        status: 'error',
        message: 'El slug de la categoría ya existe.',
      });
    }

    // Crear categoría de productos
    const newCategory = await Category.create(
      {
        category_name,
        category_slug,
        description,
        is_active: true,
      },
      { transaction: t }
    );

    await t.commit();

    // Invalida caché relacionada al catálogo
    await Promise.all([
      clearCacheByPattern('categories:*'),
      clearCacheByPattern('products:*'),
      clearCacheByPattern('catalog:*'),
    ]);

    return res.status(201).json({
      status: 'success',
      message: 'Categoría de producto creada correctamente.',
      category: newCategory,
    });

  } catch (err) {
    await t.rollback();
    console.error('[Categories][CreateProductCategory]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno al crear la categoría.',
    });
  }
};
