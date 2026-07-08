const { getOrSetCache } = require('../../services/cacheservice');
const Product = require('../../models/product');
const ProductCategory = require('../../models/category');

module.exports = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    const categoryId = req.query.category_id || '';
    const categorySlug = req.query.category_slug || '';
    const active = req.query.active || '';

    const cacheKey =
      `products:page=${page}&limit=${limit}` +
      `&category_id=${categoryId}&category_slug=${categorySlug}` +
      `&active=${active}`;

    const data = await getOrSetCache(cacheKey, async () => {
      const where = {};

      if (active) {
        where.is_active = active === 'true';
      }

      if (categoryId && !categorySlug) {
        where.product_category_id = categoryId;
      }

      const includes = [
        {
          model: ProductCategory,
          as: 'category',
          attributes: ['category_code', 'category_name', 'category_slug'],
          ...(categorySlug
            ? { where: { category_slug: categorySlug } }
            : {})
        }
      ];

      const { rows: products, count } = await Product.findAndCountAll({
        where,
        include: includes,
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return {
        status: 'success',
        page,
        pageSize: limit,
        total: count,
        items: products.map(p => ({
          product_code: p.product_code,
          name: p.product_name,
          sku: p.product_sku,
          price: p.product_price,
          stock: p.product_stock,
          image: p.product_image_url,
          category: p.category.category_name,
          is_active: p.is_active,
          url: `/productos/${p.product_code}/${p.product_slug}`
        }))
      };
    });

    res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).json(data);

  } catch (error) {
    console.error('[Products][GetAll]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener los productos.'
    });
  }
};
