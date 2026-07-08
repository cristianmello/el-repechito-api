// services/jwt.js
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const {
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRES_IN,
    REFRESH_TOKEN_EXPIRES_IN
} = process.env;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new Error('[JWT] Faltan ACCESS_TOKEN_SECRET o REFRESH_TOKEN_SECRET');
}

// Valores por defecto coherentes con tu .env anterior
const ACCESS_EXPIRES = ACCESS_TOKEN_EXPIRES_IN || '1h';
const REFRESH_EXPIRES = REFRESH_TOKEN_EXPIRES_IN || '7d';

function createToken(user) {
    const payload = {
        sub: user.user_code,                    // PK real
        role_code: user.role_code || user.role?.role_code,
        role_name: user.role?.role_name || null,
        email: user.user_mail || null,
        jti: randomUUID()
    };

    try {
        return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_EXPIRES });
    } catch (err) {
        console.error('[JWT][createToken]', err);
        throw new Error('No se pudo generar el token de acceso.');
    }
}

function createRefreshToken(user) {
    const payload = {
        sub: user.user_code,
        email: user.user_mail || null,
        jti: randomUUID()
    };

    try {
        return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES });
    } catch (err) {
        console.error('[JWT][createRefreshToken]', err);
        throw new Error('No se pudo generar el token de refresh.');
    }
}

module.exports = {
    createToken,
    createRefreshToken
};
