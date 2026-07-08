const { check } = require('express-validator');

const validateUserRegister = [
  check('user_name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres')
    .matches(/^[a-zñáéíóú\s]+$/i).withMessage("El nombre solo puede contener letras, acentos y espacios"),

  check('user_lastname')
    .notEmpty().withMessage('El apellido es obligatorio')
    .isLength({ min: 3, max: 150 }).withMessage('El apellido debe tener entre 3 y 150 caracteres')
    .matches(/^[a-zñáéíóú\s]+$/i).withMessage("El apellido solo puede contener letras, acentos y espacios"),

  check('user_mail')
    .notEmpty().withMessage('El correo es obligatorio')
    .isEmail({ allow_display_name: false, domain_specific_validation: true }).withMessage('Debe ser un correo electrónico válido y con un dominio accesible')
    .normalizeEmail({
      all_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_dots: false,
      yahoo_remove_dots: false,
      icloud_remove_dots: false
    }),

  check('user_password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

  check('user_birth')
    .optional()
    .isISO8601().withMessage('Debe ser una fecha válida en formato ISO (YYYY-MM-DD)'),

  check('user_phone')
    .optional({ checkFalsy: true })
    .matches(/^[\d\s+\-()]+$/)
    .withMessage('Formato de teléfono inválido'),

  check('role_code')
    .optional()
    .isInt().withMessage('El rol debe ser un número entero'),

  check('is_vip')
    .optional()
    .isBoolean().withMessage('is_vip debe ser verdadero o falso')
];

module.exports = validateUserRegister;
