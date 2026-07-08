const User = require('../../models/user');
const { uploadToBunny, deleteFromBunny } = require('../../services/bunnystorage');

module.exports = async function updateProfileImage(req, res) {
    try {
        const userId = req.user.id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ status: 'error', message: 'No se envió ninguna imagen.' });
        }

        // Construir nombre: user-{id}-{ts}.{ext}
        const ext = file.originalname.split('.').pop();
        const filename = `user-${userId}-${Date.now()}.${ext}`;
        const folder = 'profile-images/';

        // Subir nueva imagen
        const imageUrl = await uploadToBunny(file.buffer, folder, filename);
        console.log('[DEBUG] ID recibido:', userId);

        // Buscar usuario
        const user = await User.findByPk(userId);
        console.log('[DEBUG] Usuario encontrado:', user?.user_mail || 'Ninguno');

        if (!user) {
            // Si subió bien pero el user no existe, borramos el archivo recién subido
            await deleteFromBunny(imageUrl);
            return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        }

        // Borrar imagen anterior (si no es default)
        if (user.user_image && !(user.user_image.endsWith('default.png') || user.user_image.endsWith('default.webp'))) {
            await deleteFromBunny(user.user_image);
        }


        // Guardar nueva URL en DB
        user.user_image = imageUrl;
        await user.save();

        return res.json({
            status: 'success',
            message: 'Imagen de perfil actualizada.',
            imageUrl
        });
    } catch (err) {
        console.error('[User][UpdateProfileImage]', err);
        return res.status(500).json({ status: 'error', message: 'Error interno al procesar la imagen.' });
    }
};
