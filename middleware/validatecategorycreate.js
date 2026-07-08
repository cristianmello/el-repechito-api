const { check } = require('express-validator');

module.exports = [
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
