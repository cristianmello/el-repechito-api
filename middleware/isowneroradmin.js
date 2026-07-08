/**
 * Middleware que permite el acceso si el usuario es dueño del recurso o tiene rol 'admin' o 'superadmin'
 * 
 * @param {Function} getOwnerIdFn - Función que recibe (req) y devuelve el ID del recurso que se quiere acceder
 */
function isOwnerOrAdmin(getOwnerIdFn) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Usuario no autenticado' });
    }

    const requestedId = getOwnerIdFn(req);
    const isOwner = user.id === requestedId;
    const isAdmin = user.roles.includes('admin');
    const isSuperAdmin = user.roles.includes('superadmin');

    if (!isOwner && !isAdmin && !isSuperAdmin) {
      return res.status(403).json({ status: 'error', message: 'Acceso denegado' });
    }

    next();
  };
}

module.exports = isOwnerOrAdmin;
