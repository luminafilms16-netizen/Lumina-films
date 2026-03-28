const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Envía correo de recuperación de contraseña
 */
async function sendPasswordReset(toEmail, nombre, resetLink) {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: '🎬 Lumina Films – Recuperación de contraseña',
    html: `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
        <div style="background:#c8a96e;padding:24px 32px;">
          <h1 style="margin:0;color:#0a0a0a;font-size:22px;letter-spacing:2px;font-weight:700;">LUMINA FILMS</h1>
        </div>
        <div style="padding:40px 32px;">
          <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">Hola, ${nombre}</h2>
          <p style="color:#aaa;line-height:1.7;margin:0 0 32px;">
            Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón a continuación. 
            El enlace expirará en <strong style="color:#c8a96e;">1 hora</strong>.
          </p>
          <a href="${resetLink}" 
             style="display:inline-block;background:#c8a96e;color:#0a0a0a;text-decoration:none;
                    padding:14px 32px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:1px;">
            RESTABLECER CONTRASEÑA
          </a>
          <p style="color:#555;font-size:12px;margin:32px 0 0;">
            Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
          </p>
        </div>
      </div>
    </body>
    </html>`
  });
}

/**
 * Envía correo de confirmación de compra con QR
 */
async function sendTicketConfirmation(toEmail, ticketData) {
  const { nombre, codigo, pelicula, sala, fecha, hora, asientos, total, qrDataUrl } = ticketData;

  const asientosHtml = asientos
    .map(a => `<span style="background:#222;border:1px solid #333;padding:4px 10px;border-radius:4px;color:#c8a96e;font-weight:700;margin:2px;display:inline-block;">${a.fila}${a.columna}</span>`)
    .join(' ');

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: `🎟️ Lumina Films – Tu tiquete para ${pelicula}`,
    html: `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
        <div style="background:#c8a96e;padding:24px 32px;">
          <h1 style="margin:0;color:#0a0a0a;font-size:22px;letter-spacing:2px;font-weight:700;">LUMINA FILMS</h1>
          <p style="margin:4px 0 0;color:#0a0a0a;opacity:0.7;font-size:13px;">Confirmación de compra</p>
        </div>
        <div style="padding:40px 32px;">
          <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">${pelicula}</h2>
          <p style="color:#aaa;margin:0 0 32px;">Gracias ${nombre}, tu compra fue confirmada.</p>
          
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr><td style="color:#555;padding:8px 0;border-bottom:1px solid #1a1a1a;font-size:13px;">Sala</td>
                <td style="color:#fff;padding:8px 0;border-bottom:1px solid #1a1a1a;text-align:right;font-size:13px;">${sala}</td></tr>
            <tr><td style="color:#555;padding:8px 0;border-bottom:1px solid #1a1a1a;font-size:13px;">Fecha</td>
                <td style="color:#fff;padding:8px 0;border-bottom:1px solid #1a1a1a;text-align:right;font-size:13px;">${fecha}</td></tr>
            <tr><td style="color:#555;padding:8px 0;border-bottom:1px solid #1a1a1a;font-size:13px;">Hora</td>
                <td style="color:#fff;padding:8px 0;border-bottom:1px solid #1a1a1a;text-align:right;font-size:13px;">${hora}</td></tr>
            <tr><td style="color:#555;padding:8px 0;border-bottom:1px solid #1a1a1a;font-size:13px;">Asientos</td>
                <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;text-align:right;">${asientosHtml}</td></tr>
            <tr><td style="color:#c8a96e;padding:12px 0;font-weight:700;">TOTAL</td>
                <td style="color:#c8a96e;padding:12px 0;text-align:right;font-weight:700;font-size:18px;">$${total.toLocaleString()}</td></tr>
          </table>

          <div style="text-align:center;background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:24px;margin-bottom:24px;">
            <p style="color:#555;font-size:12px;margin:0 0 12px;letter-spacing:2px;text-transform:uppercase;">Código QR de acceso</p>
            <img src="${qrDataUrl}" alt="QR Code" style="width:160px;height:160px;border-radius:4px;">
            <p style="color:#c8a96e;font-size:13px;letter-spacing:2px;font-weight:700;margin:12px 0 0;">${codigo}</p>
          </div>

          <p style="color:#555;font-size:11px;line-height:1.6;margin:0;text-align:center;">
            Presenta este código QR en la entrada. No compartas tu tiquete.
          </p>
        </div>
      </div>
    </body>
    </html>`
  });
}

module.exports = { sendPasswordReset, sendTicketConfirmation };
