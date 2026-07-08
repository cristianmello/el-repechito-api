// src/controllers/categories/getCategoryById.js
const Category = require('../../models/category');
const { getOrSetCache } = require('../../services/cacheservice');

module.exports = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de categoría inválido.',
      });
    }

    const cacheKey = `inventory:category:${id}`;

    const category = await getOrSetCache(
      cacheKey,
      async () => {
        return Category.findOne({
          where: {
            category_code: id,
            is_active: true
          },
          attributes: [
            'category_code',
            'category_name',
            'category_slug',
            'description'
          ]
        });
      },
      3600
    );

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Categoría no encontrada.',
      });
    }

    res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');

    return res.status(200).json({
      status: 'success',
      data: category,
    });

  } catch (error) {
    console.error('[Inventory][Categories][GetById]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener la categoría.',
    });
  }
};
