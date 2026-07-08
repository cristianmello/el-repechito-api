// controllers/products/updateProduct.js
const Product = require('../../models/product');
const Category = require('../../models/category');
let ProductLog;
try { ProductLog = require('../../models/productlog'); } catch (e) { ProductLog = null; }
const redisClient = require('../../services/redisclient');
const { uploadToBunny, deleteFromBunny } = require('../../services/bunnystorage');

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
    // Pre-upload handling: if there's a new image, upload first so we have the URL to save.
    let newImageUrl = null;
    let uploadedNewImage = false;
    const hasNewImage = Boolean(req.processedImage);

    try {
        if (hasNewImage) {
            // upload first; if DB fails we'll try to remove this uploaded file later
            newImageUrl = await uploadToBunny(
                req.processedImage.buffer,
                'product-images/',
                req.processedImage.filename
            );
            uploadedNewImage = true;
        }
    } catch (uploadErr) {
        console.error('[Products][Update][Upload]', uploadErr);
        return res.status(502).json({ status: 'error', message: 'Error subiendo la imagen.' });
    }

    const t = await Product.sequelize.transaction();
    // Keep reference to old image to delete after successful commit
    let oldImageUrl = null;

    try {
        const { id } = req.params; // product_code

        // 1) Buscar producto
        const product = await Product.findByPk(id, { transaction: t });
        if (!product) {
            // cleanup uploaded image if any
            try { if (uploadedNewImage) await deleteFromBunny(newImageUrl); } catch (e) { /* swallow */ }
            await t.rollback();
            return res.status(404).json({ status: 'error', message: 'Producto no encontrado.' });
        }

        // 2) Validar categoría si se pide actualizar
        const category_code = req.body.category_code ?? req.body.category_id ?? null;
        if (category_code && Number(category_code) !== Number(product.category_code)) {
            const categoryExists = await Category.findByPk(category_code, { transaction: t });
            if (!categoryExists) {
                try { if (uploadedNewImage) await deleteFromBunny(newImageUrl); } catch (e) { }
                await t.rollback();
                return res.status(404).json({ status: 'error', message: 'Categoría no existe.' });
            }
        }

        // 3) Campos permitidos y mapeo a los nombres reales del modelo
        // Nota: incoming keys pueden ser product_name, product_slug, product_description, product_price, product_stock, category_code (o category_id)
        const allowedInputMap = {
            product_name: 'product_name',
            product_slug: 'product_slug',
            product_description: 'description', // mapear a description
            product_price: 'price',
            product_stock: 'stock',
            category_code: 'category_code',
            category_id: 'category_code',
            sku: 'sku',
            barcode: 'barcode',
            is_active: 'is_active'
        };

        const updatedFields = {};
        for (const key of Object.keys(allowedInputMap)) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updatedFields[allowedInputMap[key]] = req.body[key];
            }
        }

        // Si subimos una nueva imagen, setear image_url al valor recibido del CDN
        if (newImageUrl) {
            oldImageUrl = product.image_url || null; // guardar para borrar después del commit
            updatedFields.image_url = newImageUrl;
        }

        // 4) Actualizar dentro de transacción
        await product.update(updatedFields, { transaction: t });

        // 5) Log (opcional) - no rompemos la actualización si falla el log
        if (ProductLog && req.user) {
            try {
                await ProductLog.create({
                    user_code: req.user.user_code || req.user.sub,
                    product_code: product.product_code,
                    action: 'update',
                    details: JSON.stringify({ fields: Object.keys(updatedFields) })
                }, { transaction: t });
            } catch (logErr) {
                console.warn('[Products][Update] ProductLog failed:', logErr && logErr.message ? logErr.message : logErr);
                // no throw
            }
        }

        // 6) Commit DB
        await t.commit();

        // 7) Post-commit: borrar imagen antigua (si la había y no es "default")
        if (oldImageUrl && !oldImageUrl.includes('default')) {
            try {
                await deleteFromBunny(oldImageUrl);
            } catch (delErr) {
                console.warn('[Products][Update] failed to delete old image:', delErr && delErr.message ? delErr.message : delErr);
            }
        }

        // 8) Limpiar cache (intentar, no bloquear)
        try {
            await clearByPattern('products*');
            await clearByPattern('warehouse*');
            await clearByPattern('product_categories*');
        } catch (cacheErr) {
            console.warn('[Products][Update] cache cleanup error:', cacheErr && cacheErr.message ? cacheErr.message : cacheErr);
        }

        // 9) Refrescar el objeto para devolver al cliente (opcional)
        const fresh = await Product.findByPk(product.product_code);

        return res.status(200).json({
            status: 'success',
            message: 'Producto actualizado correctamente.',
            product: fresh
        });

    } catch (error) {
        // rollback y cleanup de imagen subida si corresponde
        try { await t.rollback(); } catch (e) { }
        if (uploadedNewImage && newImageUrl) {
            try { await deleteFromBunny(newImageUrl); } catch (e) { /* swallow */ }
        }
        console.error('[Products][Update]', error);
        return res.status(500).json({ status: 'error', message: 'Error al actualizar el producto.' });
    }
};
