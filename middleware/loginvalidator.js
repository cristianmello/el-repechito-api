const { check } = require('express-validator');

const validateLogin = [
  check('user_mail')
    .isEmail({ allow_display_name: false, domain_specific_validation: true }).withMessage('Correo inválido')
    .normalizeEmail({
      all_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_dots: false,
      yahoo_remove_dots: false,
      icloud_remove_dots: false
    }),

  check('user_password')
    .notEmpty().withMessage('Contraseña requerida')
    .isLength({ min: 6 }).withMessage('Contraseña inválida')
];

module.exports = validateLogin;
