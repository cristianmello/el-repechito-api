const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

module.exports = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (!allowedMimes.includes(file.mimetype) || !['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            return cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'), false);
        }
        cb(null, true);
    }
});
