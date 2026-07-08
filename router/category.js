const express = require('express');
const router = express.Router();

// =====================
// Middlewares
// =====================
const authenticate = require('../middleware/verifytoken');
const authorize = require('../middleware/authorizerole');
const handleValidationErrors = require('../middleware/handlevalidationerrors');

// Validaciones (si las tenés)
const validateCategoryCreate = require('../middleware/validatecategorycreate');
const validateCategoryUpdate = require('../middleware/validatecategoryupdate');

// =====================
// Controllers (ALMACÉN)
// =====================
const createCategory = require('../controller/productscategories/createproductcategory');
const getAllCategories = require('../controller/productscategories/getallcategories');
const getCategoryById = require('../controller/productscategories/getcategorybyid');
const updateCategory = require('../controller/productscategories/updatecategory');
const deleteCategory = require('../controller/productscategories/deletecategory');

// =====================
// RUTAS PÚBLICAS
// =====================

// Listado de categorías (store)
router.get(
    '/',
    getAllCategories
);

// Categoría por ID
router.get(
    '/:id',
    getCategoryById
);

// =====================
// RUTAS PROTEGIDAS (ADMIN)
// =====================

// Crear categoría
router.post(
    '/',
    authenticate,
    authorize('admin', 'superadmin'),
    validateCategoryCreate,
    handleValidationErrors,
    createCategory
);

// Actualizar categoría
router.put(
    '/:id',
    authenticate,
    authorize('admin', 'superadmin'),
    validateCategoryUpdate,
    handleValidationErrors,
    updateCategory
);

// Eliminar categoría
router.delete(
    '/:id',
    authenticate,
    authorize('admin', 'superadmin'),
    deleteCategory
);

module.exports = router;
