// controllers/products/createProduct.js
const Product = require('../../models/product');
const Category = require('../../models/category'); // modelo real
const redisClient = require('../../services/redisclient'); // nombre case-sensitive
const { uploadToBunny } = require('../../services/bunnystorage'); // asumo que existe
let ProductLog;
try {
    ProductLog = require('../../models/productlog');
} catch (e) {
    // Si no existe ProductLog, no rompemos la creación
    ProductLog = null;
}

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
    try {
        const {
            product_name,
            product_sku,
            product_description,
            product_price,
            product_stock,
            // product_min_stock, // no existe en tu modelo Product
            product_category_id,
            product_is_active = true
        } = req.body;

        // Validaciones mínimas - p.ej. campos obligatorios
        if (!product_name || typeof product_name !== 'string') {
            await t.rollback();
            return res.status(400).json({ status: 'error', message: 'product_name es obligatorio' });
        }

        // Validar categoría (category_code es la PK real)
        const categoryExists = await Category.findByPk(product_category_id, { transaction: t });
        if (!categoryExists) {
            await t.rollback();
            return res.status(404).json({
                status: 'error',
                message: 'La categoría del producto no existe.'
            });
        }

        // Subida de imagen (opcional)
        let image_url = null;
        if (req.processedImage) {
            image_url = await uploadToBunny(
                req.processedImage.buffer,
                'product-images/',
                req.processedImage.filename
            );
        }

        // Crear producto usando los campos reales del modelo Product
        const newProduct = await Product.create({
            product_name,
            sku: product_sku || null,
            description: product_description || null,
            price: product_price != null ? product_price : 0.0,
            stock: product_stock != null ? product_stock : 0,
            category_code: product_category_id,
            image_url,
            is_active: product_is_active
        }, { transaction: t });

        // Log de creación (si existe y si req.user trae user_code)
        if (ProductLog && req.user && (req.user.user_code || req.user.user_code === 0)) {
            try {
                await ProductLog.create({
                    user_code: req.user.user_code,
                    product_code: newProduct.product_code,
                    action: 'create',
                    details: JSON.stringify({
                        name: product_name,
                        sku: product_sku,
                        stock: product_stock
                    })
                    // created_at se setea por el modelo si corresponde
                }, { transaction: t });
            } catch (logErr) {
                // No rompemos la creación si falla el log — lo registramos
                console.warn('[CreateProduct] No se pudo guardar ProductLog:', logErr.message || logErr);
            }
        }

        await t.commit();

        // Limpiar cache si está habilitado
        if (redisClient) {
            try {
                await clearByPattern('products*');
                await clearByPattern('warehouse*');
                await clearByPattern('product_categories*');
            } catch (cacheErr) {
                console.warn('[CreateProduct] Error limpiando cache:', cacheErr.message || cacheErr);
            }
        }

        return res.status(201).json({
            status: 'success',
            message: 'Producto creado correctamente.',
            product: newProduct
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* noop */ }
        console.error('[Warehouse][CreateProduct]', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al crear el producto.'
        });
    }
};
