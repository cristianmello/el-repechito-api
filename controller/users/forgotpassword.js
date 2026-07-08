// controllers/auth/forgotPassword.js
const crypto = require('crypto');
const redisClient = require('../../services/redisclient');
const User = require('../../models/user');
const PasswordResetLog = require('../../models/forgotpasswordlog');

const { CLIENT_URL, BREVO_API_KEY, SMTP_FROM_NAME, SMTP_FROM_ADDRESS } = process.env;

async function sendEmailViaBrevo(to, subject, htmlContent) {
  if (!BREVO_API_KEY) throw new Error('Falta BREVO_API_KEY');
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: SMTP_FROM_NAME, email: SMTP_FROM_ADDRESS },
      to: [{ email: to }],
      subject,
      htmlContent
    })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Brevo API error: ${resp.status} - ${text}`);
  }
  return resp.json();
}

const forgotPassword = async (req, res) => {
  const { user_mail } = req.body;
  try {
    const user = await User.findOne({ where: { user_mail } });

    // Responder igual aun si no existe (evita enumeración de emails)
    if (!user) {
      return res.status(200).json({
        status: 'success',
        message: 'Si existe, enviaremos un email con instrucciones.'
      });
    }

    const userCode = user.user_code;

    // Registrar intento (si el modelo existe)
    try {
      if (PasswordResetLog) {
        await PasswordResetLog.create({
          user_code: userCode,
          user_mail,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
      }
    } catch (logErr) {
      console.warn('[forgotPassword] Error al guardar log:', logErr.message || logErr);
    }

    // Limpiar token previo
    try {
      const oldToken = await redisClient.get(`reset_user_${userCode}`);
      if (oldToken) await redisClient.del(`reset_token_${oldToken}`);
    } catch (e) {
      console.warn('[forgotPassword] Redis cleanup fallo:', e.message || e);
    }

    // Crear token y guardarlo en Redis (1h)
    const resetToken = crypto.randomBytes(32).toString('hex');
    try {
      await redisClient.set(`reset_user_${userCode}`, resetToken, 'EX', 60 * 60);
      await redisClient.set(`reset_token_${resetToken}`, userCode, 'EX', 60 * 60);
    } catch (e) {
      console.warn('[forgotPassword] Redis set fallo:', e.message || e);
    }

    // Construir link seguro (usar CLIENT_URL como fallback)
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;

    // Enviar email (no abortar si falla el envío)
    try {
      await sendEmailViaBrevo(
        user_mail,
        '🔑 Restablece tu contraseña',
        `<p>Hola ${user.user_name || ''},</p>
         <p>Haz clic: <a href="${resetLink}">${resetLink}</a></p>
         <p>El enlace expira en 1 hora.</p>`
      );
    } catch (emailErr) {
      console.warn('[forgotPassword] Error enviando email:', emailErr.message || emailErr);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Si existe una cuenta con ese correo, se enviarán instrucciones.'
    });

  } catch (err) {
    console.error('[forgotPassword] Error:', err);
    return res.status(200).json({
      status: 'success',
      message: 'Si existe una cuenta con ese correo, se enviarán instrucciones.'
    });
  }
};

module.exports = forgotPassword;
