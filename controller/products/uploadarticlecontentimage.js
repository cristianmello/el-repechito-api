const sharp = require('sharp');
const { uploadToBunny } = require('../../services/bunnystorage');

module.exports = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No se envió ningún archivo.' });
    }

    try {
        const optimizedBuffer = await sharp(req.file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        const timestamp = Date.now();
        const filename = `article-content-${timestamp}.webp`;
        const folder = 'article-images/';

        const imageUrl = await uploadToBunny(optimizedBuffer, folder, filename);

        res.json({ location: imageUrl });

    } catch (err) {
        console.error('[UploadController] Error:', err);
        res.status(500).json({ status: 'error', message: 'Error interno al procesar la imagen.' });
    }
};

