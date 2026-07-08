const { Op } = require('sequelize');
const Product = require('../../models/product');
const Category = require('../../models/category');
const { getOrSetCache } = require('../../services/cacheservice');

module.exports = async (req, res) => {
    try {
        const currentProductId = req.params.id;

        // Validación básica
        if (!/^\d+$/.test(currentProductId)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID de producto inválido.'
            });
        }

        const cacheKey = `related-products:${currentProductId}`;

        const relatedProducts = await getOrSetCache(cacheKey, async () => {
            // 1️⃣ Obtener producto actual
            const currentProduct = await Product.findByPk(currentProductId, {
                attributes: ['product_category_id']
            });

            if (!currentProduct) return [];

            const categoryId = currentProduct.product_category_id;

            // 2️⃣ Buscar productos similares
            const products = await Product.findAll({
                where: {
                    [Op.and]: [
                        { product_category_id: categoryId },
                        { product_is_active: true },
                        { product_code: { [Op.ne]: currentProductId } }
                    ]
                },
                limit: 4,
                order: [['created_at', 'DESC']],
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['category_name']
                    }
                ]
            });

            // 3️⃣ Formatear respuesta
            return products.map(p => ({
                product_code: p.product_code,
                product_slug: p.product_slug,
                name: p.product_name,
                price: p.product_price,
                image: p.product_image_url,
                category: p.category?.category_name || 'Sin categoría',
                url: `/productos/${p.product_code}/${p.product_slug}`
            }));
        });

        return res.status(200).json({
            status: 'success',
            items: relatedProducts
        });

    } catch (error) {
        console.error('[Products][GetRelated]', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener productos relacionados.'
        });
    }
};
