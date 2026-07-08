const redisClient = require('../../services/redisclient');
const User = require('../../models/user');
const crypto = require('crypto');

const {
  CLIENT_URL,
  SMTP_FROM_NAME,
  SMTP_FROM_ADDRESS
} = process.env;

const sendEmailViaAPI = async (to, subject, htmlContent) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: SMTP_FROM_NAME, email: SMTP_FROM_ADDRESS },
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

const sendVerificationEmail = async (req, res) => {
  try {
    if (!redisClient) {
      return res.status(503).json({
        status: 'error',
        message: 'Servicio de verificación no disponible.'
      });
    }

    const { user_mail } = req.body;
    if (!user_mail || typeof user_mail !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Correo inválido.'
      });
    }

    const user = await User.findOne({ where: { user_mail } });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado.'
      });
    }

    if (user.is_verified) {
      return res.json({
        status: 'success',
        message: 'El correo ya está verificado.'
      });
    }

    // Invalida token previo si existía
    const oldToken = await redisClient.get(`verify_user_${user.user_code}`);
    if (oldToken) {
      await redisClient.del(`verify_${oldToken}`);
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');

    await redisClient.set(`verify_${verifyToken}`, user.user_code, 'EX', 86400);
    await redisClient.set(`verify_user_${user.user_code}`, verifyToken, 'EX', 86400);

    const origin = req.get('origin');
    const baseUrl = (origin && [CLIENT_URL, 'https://front-radio-internacional.pages.dev'].includes(origin))
      ? origin
      : CLIENT_URL;

    const link = `${baseUrl}/verify-email?token=${verifyToken}`;

    try {
      await sendEmailViaAPI(
        user.user_mail,
        'Verifica tu correo',
        `
        <div style="font-family: Arial, sans-serif;">
          <h2>📧 Verificación de correo</h2>
          <p>Hola ${user.user_name || ''},</p>
          <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
          <p><a href="${link}">Verificar correo</a></p>
          <p>Este enlace expirará en 24 horas.</p>
        </div>
        `
      );
    } catch (err) {
      console.error('[Email] Falló verificación:', err.message);
    }

    return res.json({
      status: 'success',
      message: 'Correo de verificación enviado.'
    });

  } catch (err) {
    console.error('[User][SendVerificationEmail]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Error al enviar el correo de verificación.'
    });
  }
};

module.exports = sendVerificationEmail;
