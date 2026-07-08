/**
 * Middleware para restringir acceso según roles
 * @param {...string} allowedRoles - Roles permitidos para la ruta (ej: 'admin', 'editor')
 */
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Usuario no autenticado o sin roles.'
      });
    }

    const hasPermission = req.user.roles.some(role =>
      allowedRoles.includes(role)
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. No tienes los permisos necesarios.'
      });
    }

    next();
  };
}

module.exports = authorizeRole;
