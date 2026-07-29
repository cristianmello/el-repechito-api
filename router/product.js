const express = require('express');
const router = express.Router();

// Middlewares
const authenticate = require('../middleware/verifytoken');
const authorize = require('../middleware/authorizerole');
const handleValidationErrors = require('../middleware/handlevalidationerrors');
const uploadMemory = require('../middleware/bunny/uploadmemory');

const uploadArticleContentImage = require('../controller/products/uploadarticlecontentimage');

const uploadMemory = require('../middleware/bunny/uploadmemory');
const uploadArticleContentImage = require('../controller/products/uploadarticlecontentimage');

// (si tenés validaciones específicas de producto, acá irían)
// const validateProductCreate = require('../middleware/validateproductcreate');
// const validateProductUpdate = require('../middleware/validateproductupdate');
// const validateGetProducts = require('../middleware/validategetproducts');

// Controllers de PRODUCTOS (los que listaste)
const {
    createProduct,
    UpdateProduct,
    DeleteProduct,
    GetProductByID,
    GetAllProducts,
    GetRelatedProducts
} = require('../controller/products');

/* =========================
   RUTAS PÚBLICAS (STORE)
========================= */

// Listado de productos
router.get(
    '/',
    // validateGetProducts,
    GetAllProducts
);

// Productos relacionados (antes que /:id/:slug)
router.get(
    '/:id/related',
    GetRelatedProducts
);

// Producto por ID + slug (canonical)
router.get(
    '/:id/:slug',
    GetProductByID
);

/* =========================
   RUTAS PROTEGIDAS (ADMIN)
========================= */

// Subir imagen de contenido (editor de artículos)
router.post(
    '/upload-image',
    authenticate,
    authorize('admin', 'superadmin'),
    uploadMemory.single('image'),
    uploadArticleContentImage
);

// Crear producto
router.post(
    '/',
    authenticate,
    authorize('admin', 'superadmin'),
    // validateProductCreate,
    handleValidationErrors,
    createProduct
);

// Actualizar producto
router.put(
    '/:id',
    authenticate,
    authorize('admin', 'superadmin'),
    // validateProductUpdate,
    handleValidationErrors,
    UpdateProduct
);

// Eliminar producto
router.delete(
    '/:id',
    authenticate,
    authorize('admin', 'superadmin'),
    DeleteProduct
);

module.exports = router;
