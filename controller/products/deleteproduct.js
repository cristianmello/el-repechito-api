// controllers/products/deleteProduct.js
const Product = require('../../models/product');
let ProductLog;
try {
    ProductLog = require('../../models/productlog');
} catch (e) {
    ProductLog = null;
}
const redisClient = require('../../services/redisclient');
const { deleteFromBunny } = require('../../services/bunnystorage');

async function clearByPattern(pattern) {
    if (!redisClient) return;
    let cursor = '0';
    do {
        const [nextCursor, keys] = await redisClient.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100
        );
        if (keys && keys.length) await redisClient.del(...keys);
        cursor = nextCursor;
    } while (cursor !== '0');
}

module.exports = async (req, res) => {
    const t = await Product.sequelize.transaction();
    let imageToDelete = null;

    try {
        const { id } = req.params; // product_code

        // 1️⃣ Buscar producto
        const product = await Product.findByPk(id, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json({
                status: 'error',
                message: 'Producto no encontrado.'
            });
        }

        // Guardar imagen para borrar luego del commit
        if (product.image_url && !product.image_url.includes('default')) {
            imageToDelete = product.image_url;
        }

        // 2️⃣ Log (opcional)
        if (ProductLog && req.user) {
            await ProductLog.create({
                user_code: req.user.user_code || req.user.sub,
                product_code: product.product_code,
                action: 'delete',
                details: JSON.stringify({
                    name: product.product_name,
                    slug: product.slug,
                    stock: product.stock
                })
            }, { transaction: t });
        }

        // 3️⃣ Eliminar producto
        await product.destroy({ transaction: t });

        // 4️⃣ Commit DB
        await t.commit();

        // 5️⃣ Borrar imagen CDN (fuera de la transacción)
        if (imageToDelete) {
            try {
                await deleteFromBunny(imageToDelete);
            } catch (err) {
                console.error('[Bunny][DeleteProductImage]', err);
            }
        }

        // 6️⃣ Limpiar cache
        try {
            await clearByPattern('products*');
            await clearByPattern('warehouse*');
            await clearByPattern('product_categories*');
        } catch (cacheErr) {
            console.error('[Redis][Cleanup]', cacheErr);
        }

        return res.json({
            status: 'success',
            message: 'Producto eliminado correctamente.'
        });

    } catch (error) {
        try { await t.rollback(); } catch (e) { }
        console.error('[Products][Delete]', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al eliminar el producto.'
        });
    }
};
