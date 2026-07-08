// src/controllers/categories/getAllCategories.js
const Category = require('../../models/category');
const { getOrSetCache } = require('../../services/cacheservice');

module.exports = async (req, res) => {
  try {
    const cacheKey = 'inventory:categories:all';

    const categories = await getOrSetCache(
      cacheKey,
      async () => {
        return Category.findAll({
          attributes: [
            'category_code',
            'category_name',
            'category_slug',
            'is_active'
          ],
          where: { is_active: true },
          order: [['category_name', 'ASC']],
        });
      },
      3600 // 1 hora
    );

    res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');

    return res.status(200).json({
      status: 'success',
      total: categories.length,
      data: categories,
    });

  } catch (error) {
    console.error('[Inventory][Categories][GetAll]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener las categorías.',
    });
  }
};
