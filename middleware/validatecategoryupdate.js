const { check, param } = require('express-validator');

module.exports = [
    // Validar el parámetro :id de la URL
    param('id')
        .isInt({ min: 1 })
        .withMessage('El ID debe ser un número entero positivo.'),

    check('category_name')
        .trim()
        .notEmpty().withMessage('El nombre de la categoría es obligatorio.')
        .isLength({ max: 100 }).withMessage('El nombre no debe exceder los 100 caracteres.'),

    check('category_slug')
        .trim()
        .notEmpty().withMessage('El slug es obligatorio.')
        .isSlug().withMessage('El slug debe ser válido (letras, números, guiones).')
        .isLength({ max: 100 }).withMessage('El slug no debe exceder los 100 caracteres.')
];
