const { param } = require('express-validator');
const handleValidationErrors = require('./handlevalidationerrors');

// Exportamos un array de middlewares, igual que el validador de usuario
module.exports = [
    // 1. Apuntamos al parámetro 'role_code' de la URL
    param('role_code')
        // 2. Aplicamos la misma regla: debe ser un entero positivo
        .isInt({ min: 1 })
        // 3. Personalizamos el mensaje de error para que sea específico del rol
        .withMessage('El ID del rol debe ser un número entero positivo'),

    handleValidationErrors
];