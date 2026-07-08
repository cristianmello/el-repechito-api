// services/redisClient.js
const Redis = require('ioredis');

let redisClient = null;

const isRedisEnabled =
    process.env.USE_REDIS === 'true' &&
    (process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL);

if (isRedisEnabled) {
    const redisUrl =
        process.env.REDIS_PUBLIC_URL ||
        process.env.REDIS_URL ||
        'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false
    });

    redisClient.on('connect', () =>
        console.log('[Redis] Conectado correctamente')
    );

    redisClient.on('error', err =>
        console.error('[Redis] Error:', err.message)
    );
} else {
    console.log('[Redis] Deshabilitado (USE_REDIS=false)');
}

module.exports = redisClient;
