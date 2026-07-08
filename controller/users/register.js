const User = require('../../models/user');
const redisClient = require('../../services/redisclient');
const crypto = require('crypto');
const RegisterLog = require('../../models/registerlog');

const {
    CLIENT_URL,
    SMTP_FROM_NAME,
    SMTP_FROM_ADDRESS,
    BREVO_API_KEY
} = process.env;

/**
 * Envío de email vía Brevo API
 */
const sendEmailViaAPI = async (to, subject, htmlContent) => {
    if (!BREVO_API_KEY) {
        throw new Error('Falta BREVO_API_KEY');
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sender: {
                name: SMTP_FROM_NAME,
                email: SMTP_FROM_ADDRESS
            },
            to: [{ email: to }],
            subject,
            htmlContent
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo API error: ${response.status} - ${errorText}`);
    }

    return response.json();
};

/**
 * Registrar un nuevo usuario
 */
const register = async (req, res) => {
    const t = await User.sequelize.transaction();

    try {
        const {
            user_name,
            user_lastname,
            user_mail,
            user_phone,
            user_password
        } = req.body;

        const fixedRole = 1; // siempre "user"

        // Crear usuario (evita doble consulta)
        const [newUser, created] = await User.findOrCreate({
            where: { user_mail },
            defaults: {
                user_name,
                user_lastname,
                user_phone,
                user_password,
                role_code: fixedRole
            },
            transaction: t
        });

        if (!created) {
            await t.rollback();
            return res.status(409).json({
                status: 'error',
                message:
                    'El correo electrónico ya está registrado. Si olvidaste tu contraseña, puedes restablecerla.'
            });
        }

        /**
         * Token de verificación de email
         */
        const verifyToken = crypto.randomBytes(32).toString('hex');

        // Guardar token en Redis (si está disponible)
        try {
            if (redisClient && typeof redisClient.set === 'function') {
                await redisClient.set(
                    `verify_${verifyToken}`,
                    newUser.user_code,
                    'EX',
                    24 * 60 * 60 // 24h
                );
            }
        } catch (redisError) {
            console.warn('[Register] Redis no disponible:', redisError.message);
        }

        /**
         * Construir URL segura
         */
        const requestOrigin = req.get('origin');
        const baseUrl =
            requestOrigin && requestOrigin === CLIENT_URL
                ? requestOrigin
                : CLIENT_URL;

        const verifyLink = `${baseUrl.replace(/\/$/, '')}/verify-email?token=${verifyToken}`;

        /**
         * Enviar email de verificación (no rompe si falla)
         */
        try {
            await sendEmailViaAPI(
                newUser.user_mail,
                '¡Confirma tu correo y activa tu cuenta!',
                `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h2>🎉 ¡Bienvenido!</h2>
          <p>Hola <strong>${newUser.user_name || 'usuario'}</strong>,</p>
          <p>Para activar tu cuenta, confirma tu correo haciendo clic en el botón:</p>
          <p style="text-align:center;">
            <a href="${verifyLink}"
               style="background:#3498db;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">
              Verificar correo
            </a>
          </p>
          <p>Este enlace expirará en 24 horas.</p>
        </div>
        `
            );
        } catch (emailError) {
            console.error('[Register] Error enviando email:', emailError.message);
        }

        /**
         * Log de registro (opcional)
         */
        try {
            if (RegisterLog) {
                await RegisterLog.create(
                    {
                        user_code: newUser.user_code,
                        user_mail: newUser.user_mail,
                        ip_address: req.ip || null,
                        user_agent: req.get('User-Agent') || null,
                        register_time: new Date()
                    },
                    { transaction: t }
                );
            }
        } catch (logError) {
            console.warn('[Register] No se pudo guardar RegisterLog:', logError.message);
        }

        await t.commit();

        /**
         * Respuesta limpia
         */
        const userResponse = {
            user_code: newUser.user_code,
            user_name: newUser.user_name,
            user_lastname: newUser.user_lastname,
            user_mail: newUser.user_mail,
            role_code: newUser.role_code
        };

        return res.status(201).json({
            status: 'success',
            message: 'Usuario registrado correctamente. Revisa tu correo para verificar tu cuenta.',
            user: userResponse
        });

    } catch (err) {
        await t.rollback();
        console.error('[Auth][Register]', err);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor.'
        });
    }
};

module.exports = register;
