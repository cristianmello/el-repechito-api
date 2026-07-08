const { getOrSetCache } = require('../../services/cacheservice');
const Product = require('../../models/product');
const Category = require('../../models/category');

module.exports = async (req, res) => {
    try {
        const { id, slug } = req.params;

        // Validación básica del ID
        if (!/^\d+$/.test(id)) {
            return res.status(404).json({
                status: 'error',
                message: 'Producto no encontrado.',
            });
        }

        const cacheKey = `product:${id}`;

        const data = await getOrSetCache(cacheKey, async () => {
            const product = await Product.findByPk(id, {
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['category_code', 'category_name', 'category_slug']
                    }
                ]
            });

            if (!product) return null;

            return product.toJSON();
        });

        if (!data) {
            return res.status(404).json({
                status: 'error',
                message: 'Producto no encontrado.',
            });
        }

        // 🔥 SEO: URL canónica
        if (data.product_slug !== slug) {
            const canonicalUrl =
                `${process.env.CLIENT_URL}/productos/${data.product_code}/${data.product_slug}`;

            return res.redirect(301, canonicalUrl);
        }

        // Cache HTTP
        res.set('Cache-Control', 'public, max-age=300, s-maxage=900');

        return res.status(200).json({
            status: 'success',
            product: data
        });

    } catch (error) {
        console.error('[Products][GetById-Canonical]', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener el producto.',
        });
    }
};
