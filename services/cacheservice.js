// services/cacheService.js
const redisClient = require('./redisclient');

const DEFAULT_EXPIRATION = 300;

const getOrSetCache = async (key, fetchCallback, expiration = DEFAULT_EXPIRATION) => {
    const cached = await redisClient.get(key);
    if (cached) {
        return JSON.parse(cached);
    }

    const freshData = await fetchCallback();

    await redisClient.setex(key, expiration, JSON.stringify(freshData));
    return freshData;
};

/**
 * Limpia/invalida claves de la caché que coincidan con un patrón.
 * Usa SCAN para no bloquear el servidor de Redis.
 */
async function clearByPattern(pattern) {
    let cursor = '0';
    do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        cursor = nextCursor;
    } while (cursor !== '0');
}

// Exportamos ambas funciones para que estén disponibles en toda la aplicación
module.exports = {
    getOrSetCache,
    clearByPattern
};