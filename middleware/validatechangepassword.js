// middleware/ValidateChangePassword.js
const { check } = require('express-validator');

const validateChangePassword = [
  check('oldPassword')
    .notEmpty()
    .withMessage('La contraseña actual es obligatoria.'),
  check('newPassword')
    .isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.')
    .matches(/\d/).withMessage('Debe contener al menos un número.')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una letra mayúscula.'),
];

module.exports = validateChangePassword;
