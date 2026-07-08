const sharp = require('sharp');

/**
 * Optimiza la imagen a máximo 800x800 y convierte a WebP (calidad 80)
 */
async function transformImage(req, res, next) {
  if (!req.file) return next();

  try {
    const optimized = await sharp(req.file.buffer)
      .resize({ width: 800, height: 800, fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();

    req.file.buffer = optimized;
    req.file.mimetype = 'image/webp';
    req.file.originalname = req.file.originalname.replace(/\.\w+$/, '.webp');
    next();
  } catch (err) {
    console.error('[TransformImage]', err);
    return res.status(500).json({ status: 'error', message: 'Error al procesar la imagen.' });
  }
}

module.exports = transformImage;
