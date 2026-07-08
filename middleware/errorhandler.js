'use strict';

const { ValidationError } = require('sequelize');

/**
 * Middleware global de manejo de errores.
 * Debe ir AL FINAL de todas las rutas y middlewares.
 */
function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';

  // Request ID para correlación de logs
  const requestId = req.id || '–';
  const method = req.method || '–';
  const url = req.originalUrl || req.url || '–';

  // Manejo explícito de CSRF (csurf)
  if (err && err.code === 'EBADCSRFTOKEN') {
    console.warn(`[CSRF][${requestId}] ${method} ${url} -> invalid csrf token`);
    return res.status(403).json({
      status: 'error',
      message: 'Token CSRF inválido o ausente',
      requestId,
      path: url,
      method
    });
  }

  // 1) Errores de validación de express-validator
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      status: 'error',
      message: 'Errores de validación',
      errors: err.array().map(e => ({ field: e.param, message: e.msg })),
      requestId,
      path: url,
      method
    });
  }

  // 2) Errores de JWT (jsonwebtoken)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    console.warn(`[Auth][${requestId}] ${method} ${url} -> ${err.name}`);
    return res.status(401).json({
      status: 'error',
      message: 'Token inválido o expirado',
      requestId,
      path: url,
      method
    });
  }

  // 3) Errores de Sequelize
  if (err instanceof ValidationError) {
    return res.status(422).json({
      status: 'error',
      message: 'Error de base de datos: datos no válidos',
      errors: err.errors.map(e => ({ field: e.path, message: e.message })),
      requestId,
      path: url,
      method
    });
  }

  // 4) Errores operacionales (tienen status y mensaje amigable)
  if (err.isOperational) {
    console.info(`[Operational][${requestId}] ${method} ${url} -> ${err.message}`);
    return res.status(err.statusCode || 400).json({
      status: 'error',
      message: err.message,
      requestId,
      path: url,
      method
    });
  }

  // 5) Cualquier otro (errores de programación, bugs, etc.)
  // Log completo para depuración (incluye method + url + requestId)
  console.error(`[Error][${requestId}] ${method} ${url}`, err);

  const errorResponse = {
    status: 'error',
    message: 'Error interno del servidor',
    requestId,
    path: url,
    method
  };

  // En desarrollo muestra stack
  if (!isProd) {
    errorResponse.stack = err.stack;
    errorResponse.detail = err.message;
  }

  res.status(500).json(errorResponse);
}

module.exports = errorHandler;
