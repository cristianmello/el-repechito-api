const { check } = require('express-validator');

const validateUserUpdate = [
    check('user_name')
        .optional()
        .isLength({ min: 3 }).withMessage('Mínimo 3 caracteres'),

    check('user_lastname')
        .optional()
        .isLength({ min: 3 }).withMessage('Mínimo 3 caracteres'),

    check('user_phone')
        .optional({ checkFalsy: true })
        .matches(/^[\d\s+\-()]+$/).withMessage('Formato inválido'),


    check('user_birth')
        .optional()
        .isDate().withMessage('Debe ser una fecha válida')
        .custom(value => {
            const minDate = new Date();
            minDate.setFullYear(minDate.getFullYear() - 12);
            if (new Date(value) > minDate) {
                throw new Error('Debes tener al menos 12 años');
            }
            return true;
        }),
];

module.exports = validateUserUpdate;
