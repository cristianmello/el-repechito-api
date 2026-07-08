const { param } = require('express-validator');
const handleValidationErrors = require('./handlevalidationerrors');

module.exports = [
  param('user_code')
    .isInt({ min: 1 })
    .withMessage('El ID de usuario debe ser un número entero positivo'),
  handleValidationErrors
];
