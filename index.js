if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const database = require('./database/connection');
require('./database/associations');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const startOrderExpirationJob = require('./jobs/orderexpiration.job');

// Routers
const productsouter = require('./router/product');
const categoriesRouter = require('./router/category');
const productsRouter = require('./router/product');
const authRouter = require('./router/user');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

/* ======================
   Middlewares globales
====================== */

app.use(helmet());
app.use(compression());

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}));

// Request ID (trazabilidad)
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Rate limit SOLO para API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => req.method === 'GET'
});
app.use('/api', apiLimiter);

/* ======================
   Healthcheck
====================== */

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        env: process.env.NODE_ENV || 'development',
        requestId: req.id
    });
});

/* ======================
   Rutas del sistema
====================== */

// Auth / usuarios (login, roles, etc)
app.use('/api/auth', authRouter);

// Artículos (CMS / contenido)
app.use('/api/articles', productsouter);

// Categorías (artículos / productos)
app.use('/api/categories', categoriesRouter);

// Productos (almacén)
app.use('/api/products', productsRouter);

/* ======================
   404
====================== */

app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Ruta no encontrada',
        requestId: req.id
    });
});

/* ======================
   Error handler global
====================== */

app.use((err, req, res, next) => {
    logger.error(err.message, {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        stack: err.stack,
        user: req.user?.id
    });

    errorHandler(err, req, res, next);
});

/* ======================
   Bootstrap servidor
====================== */

(async () => {
    try {
        await database.authenticate();
        logger.info('Conexión a la base de datos establecida');

        // 🔥 INICIAR JOBS (solo una vez)
        startOrderExpirationJob();
        logger.info('Job de expiración de órdenes iniciado');

        app.listen(PORT, () => {
            logger.info(`API Almacén corriendo en puerto ${PORT}`);
        });
    } catch (err) {
        logger.error('Error al iniciar el servidor', err);
        process.exit(1);
    }
})();


/* ======================
   Errores críticos
====================== */

process.on('unhandledRejection', err => {
    logger.error('UNHANDLED REJECTION', err);
    process.exit(1);
});

process.on('uncaughtException', err => {
    logger.error('UNCAUGHT EXCEPTION', err);
    process.exit(1);
});
