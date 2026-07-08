// services/bunnyStorage.js
const { URL } = require('url');

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;         // e.g. 'pruebaradioint'
const STORAGE_KEY = process.env.BUNNY_STORAGE_PASSWORD;
const STORAGE_HOST = process.env.BUNNY_STORAGE_HOST;         // 'br.storage.bunnycdn.com'
const PROTO = process.env.BUNNY_STORAGE_PROTOCOL || 'https';

// El Pull Zone público asociado a tu Storage Zone:
const PULL_ZONE_HOST = `${STORAGE_ZONE}.b-cdn.net`;

/**
 * Sube un buffer a la Storage Zone y devuelve la URL pública a través del Pull Zone.
 * @param {Buffer} buffer  - Contenido del archivo
 * @param {string} folder  - Carpeta dentro de la Storage Zone (p.ej. 'article-images/')
 * @param {string} name    - Nombre de archivo (p.ej. 'imagen.webp')
 * @returns {string} URL pública para usar en el frontend
 */
async function uploadToBunny(buffer, folder = '', name) {
    if (!Buffer.isBuffer(buffer)) {
        throw new TypeError('El archivo debe ser un buffer');
    }
    if (!name || typeof name !== 'string') {
        throw new TypeError('El nombre de archivo es obligatorio');
    }

    const pathKey = `${folder}${name}`;
    // URL para subir a Storage Zone
    const uploadUrl = `${PROTO}://${STORAGE_HOST}/${STORAGE_ZONE}/${pathKey}`;

    const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            AccessKey: STORAGE_KEY,
            'Content-Type': 'application/octet-stream',
            'Content-Length': buffer.length
        },
        body: buffer
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error subiendo a Bunny: ${res.status} ${text}`);
    }

    // URL pública servida por el Pull Zone
    return `${PROTO}://${PULL_ZONE_HOST}/${pathKey}`;
}

/**
 * Elimina un archivo de la Storage Zone. publicUrl puede ser Pull Zone o Storage Host.
 * @param {string} publicUrl - URL devuelta al subir (puede ser Pull Zone o Storage Host)
 */
async function deleteFromBunny(publicUrl) {
    if (typeof publicUrl !== 'string') {
        throw new TypeError('La URL pública debe ser una cadena');
    }
    const parsed = new URL(publicUrl);

    // Si viene del Pull Zone, reemplazamos host para apuntar al Storage Host
    let storagePath = parsed.pathname;
    if (parsed.host === PULL_ZONE_HOST) {
        // ruta: /article-images/xyz.webp => storagePath = /pruebaradioint/article-images/xyz.webp
        storagePath = `/${STORAGE_ZONE}${parsed.pathname}`;
    }

    const apiUrl = `${PROTO}://${STORAGE_HOST}${storagePath}`;

    const res = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { AccessKey: STORAGE_KEY }
    });

    if (!res.ok && res.status !== 404) {
        const text = await res.text();
        throw new Error(`Error borrando en Bunny: ${res.status} ${text}`);
    }
}

module.exports = { uploadToBunny, deleteFromBunny };
