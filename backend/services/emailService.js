const nodemailer = require('nodemailer');
const QRCode     = require('qrcode');
const sharp      = require('sharp');
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

// Escapa caracteres especiales XML para usar dentro del SVG
function x(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Genera un PNG del ticket usando SVG + sharp.
 * No requiere puppeteer ni canvas — funciona en cualquier entorno Node.js.
 */
async function generateTicketPNG(ticketData) {
  const { nombre, codigo, pelicula, sala, fecha, hora, asientos, total } = ticketData;

  // QR como PNG embebido en base64 dentro del SVG
  const qrBuffer = await QRCode.toBuffer(codigo, {
    width: 160, margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
  const qrB64 = qrBuffer.toString('base64');

  const W = 520, H = 580;

  // Badges de asientos
  let seatBadges = '';
  let sx = 32;
  const sy = 390;
  asientos.forEach(a => {
    const label = `${a.fila}${a.columna}`;
    const bw = label.length * 9 + 16;
    seatBadges += `
      <rect x="${sx}" y="${sy}" width="${bw}" height="22" rx="4"
            fill="rgba(200,169,110,0.12)" stroke="#c8a96e" stroke-width="0.8"/>
      <text x="${sx + bw / 2}" y="${sy + 14}"
            font-family="Arial,sans-serif" font-size="11" font-weight="700"
            fill="#c8a96e" text-anchor="middle">${x(label)}</text>`;
    sx += bw + 6;
  });

  const titulo = pelicula.length > 38 ? pelicula.substring(0, 38) + '…' : pelicula;
  const comprador = nombre.length > 22 ? nombre.substring(0, 22) + '…' : nombre;

  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="hdrGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#c8a96e"/>
      <stop offset="50%"  stop-color="#e8c97e"/>
      <stop offset="100%" stop-color="#b8913e"/>
    </linearGradient>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#181510"/>
      <stop offset="100%" stop-color="#0e0c09"/>
    </linearGradient>
    <clipPath id="rc"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  </defs>

  <!-- Fondo -->
  <rect width="${W}" height="${H}" rx="16" fill="url(#bgGrad)"/>
  <rect width="${W}" height="${H}" rx="16" fill="none" stroke="rgba(200,169,110,0.25)" stroke-width="1.5"/>

  <!-- Header dorado -->
  <rect x="0" y="0" width="${W}" height="80" fill="url(#hdrGrad)" clip-path="url(#rc)"/>
  <rect x="0" y="64" width="${W}" height="16" fill="url(#hdrGrad)"/>
  <text x="32" y="46" font-family="Arial Black,Arial,sans-serif" font-size="22" font-weight="900" fill="#0a0800" letter-spacing="3">LUMINA FILMS</text>
  <text x="32" y="62" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="rgba(0,0,0,0.5)" letter-spacing="2">CINEMA EXPERIENCE</text>
  <rect x="${W - 120}" y="24" width="88" height="24" rx="12" fill="rgba(0,0,0,0.18)"/>
  <text x="${W - 76}" y="40" font-family="Arial,sans-serif" font-size="10" font-weight="800" fill="#0a0800" letter-spacing="2" text-anchor="middle">E-TICKET</text>

  <!-- Sección película -->
  <rect x="0" y="80" width="${W}" height="72" fill="rgba(0,0,0,0.25)"/>
  <line x1="0" y1="152" x2="${W}" y2="152" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="6,4"/>
  <text x="32" y="116" font-family="Arial,sans-serif" font-size="19" font-weight="700" fill="#ffffff">${x(titulo)}</text>
  <text x="32" y="138" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#c8a96e" letter-spacing="2">ENTRADA CONFIRMADA  ·  ${asientos.length} ${asientos.length === 1 ? 'ASIENTO' : 'ASIENTOS'}</text>

  <!-- Datos -->
  <text x="32"  y="188" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#555" letter-spacing="1.5">SALA</text>
  <text x="32"  y="206" font-family="Arial,sans-serif" font-size="14" font-weight="600" fill="#ddd">${x(sala)}</text>
  <text x="200" y="188" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#555" letter-spacing="1.5">FECHA</text>
  <text x="200" y="206" font-family="Arial,sans-serif" font-size="14" font-weight="600" fill="#ddd">${x(fecha)}</text>
  <text x="32"  y="242" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#555" letter-spacing="1.5">HORA</text>
  <text x="32"  y="260" font-family="Arial,sans-serif" font-size="14" font-weight="600" fill="#ddd">${x(hora)}</text>
  <text x="200" y="242" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#555" letter-spacing="1.5">COMPRADOR</text>
  <text x="200" y="260" font-family="Arial,sans-serif" font-size="14" font-weight="600" fill="#ddd">${x(comprador)}</text>

  <!-- Asientos -->
  <text x="32" y="376" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#555" letter-spacing="1.5">ASIENTOS</text>
  ${seatBadges}

  <!-- Separador dashed con muescas -->
  <line x1="0" y1="428" x2="${W}" y2="428" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="6,4"/>
  <circle cx="-1"     cy="428" r="14" fill="#0a0a0a"/>
  <circle cx="${W + 1}" cy="428" r="14" fill="#0a0a0a"/>

  <!-- Zona QR -->
  <rect x="0" y="428" width="${W}" height="${H - 428}" fill="rgba(0,0,0,0.2)"/>
  <rect x="${W - 198}" y="440" width="166" height="126" rx="8" fill="#fff"/>
  <image x="${W - 195}" y="443" width="160" height="120" href="data:image/png;base64,${qrB64}"/>
  <text x="${W - 115}" y="577" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#444" letter-spacing="1" text-anchor="middle">ESCANEAR EN ENTRADA</text>

  <!-- Código y total -->
  <text x="32" y="462" font-family="Arial,sans-serif" font-size="11" font-weight="800" fill="#c8a96e" letter-spacing="2">${x(codigo)}</text>
  <text x="32" y="490" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#444">TOTAL PAGADO</text>
  <text x="32" y="516" font-family="Arial,sans-serif" font-size="22" font-weight="900" fill="#c8a96e">$${Number(total).toLocaleString('es-CO')}</text>
  <text x="32" y="565" font-family="Arial,sans-serif" font-size="10" fill="#333">Lumina Films © ${new Date().getFullYear()}</text>
</svg>`;

  return sharp(Buffer.from(svg))
    .png({ compressionLevel: 8 })
    .toBuffer();
}

// ─── Recuperación de contraseña ──────────────────────────────────────────────
async function sendPasswordReset(toEmail, nombre, resetLink) {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: '🎬 Lumina Films – Recuperación de contraseña',
    html: `
    <!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
        <div style="background:#c8a96e;padding:24px 32px;">
          <h1 style="margin:0;color:#0a0a0a;font-size:22px;letter-spacing:2px;font-weight:700;">LUMINA FILMS</h1>
        </div>
        <div style="padding:40px 32px;">
          <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">Hola, ${nombre}</h2>
          <p style="color:#aaa;line-height:1.7;margin:0 0 32px;">
            Recibimos una solicitud para restablecer tu contraseña.
            El enlace expirará en <strong style="color:#c8a96e;">1 hora</strong>.
          </p>
          <a href="${resetLink}"
             style="display:inline-block;background:#c8a96e;color:#0a0a0a;text-decoration:none;
                    padding:14px 32px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:1px;">
            RESTABLECER CONTRASEÑA
          </a>
          <p style="color:#555;font-size:12px;margin:32px 0 0;">
            Si no solicitaste este cambio, ignora este correo.
          </p>
        </div>
      </div>
    </body></html>`
  });
}

// ─── Confirmación de compra con ticket PNG adjunto ────────────────────────────
async function sendTicketConfirmation(toEmail, ticketData) {
  const { nombre, codigo, pelicula, sala, fecha, hora, asientos, total } = ticketData;

  // 1. QR inline (CID) — visible en el cuerpo del correo
  const qrBuffer = await QRCode.toBuffer(codigo, {
    width: 200, margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });

  // 2. Ticket como imagen PNG — adjunto que se ve directamente al abrirlo
  const ticketPNG = await generateTicketPNG(ticketData);

  const asientosHtml = asientos
    .map(a => `<span style="background:#222;border:1px solid #333;padding:4px 10px;border-radius:4px;color:#c8a96e;font-weight:700;margin:2px;display:inline-block;">${a.fila}${a.columna}</span>`)
    .join(' ');

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: `🎟️ Lumina Films – Tu tiquete para ${pelicula}`,
    html: `
    <!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#c8a96e,#e8c97e 50%,#b8913e);padding:24px 32px;">
          <h1 style="margin:0;color:#0a0a0a;font-size:22px;letter-spacing:2px;font-weight:700;">LUMINA FILMS</h1>
          <p style="margin:4px 0 0;color:rgba(0,0,0,.55);font-size:13px;font-weight:700;letter-spacing:1px;">Confirmación de compra</p>
        </div>
        <div style="padding:40px 32px;">
          <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">${pelicula}</h2>
          <p style="color:#aaa;margin:0 0 32px;">Gracias <strong style="color:#c8a96e">${nombre}</strong>, tu compra fue confirmada.</p>

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
                <td style="color:#c8a96e;padding:12px 0;text-align:right;font-weight:700;font-size:18px;">$${Number(total).toLocaleString('es-CO')}</td></tr>
          </table>

          <!-- QR inline con CID — visible directamente en el correo -->
          <div style="text-align:center;background:#000;border:1px solid #1e1e1e;border-radius:10px;padding:28px;margin-bottom:20px;">
            <p style="color:#555;font-size:11px;margin:0 0 14px;letter-spacing:2px;text-transform:uppercase;">Código QR de acceso</p>
            <img src="cid:qr_lumina" alt="QR Code" width="160" height="160"
                 style="width:160px;height:160px;border-radius:6px;border:4px solid #fff;display:block;margin:0 auto;">
            <p style="color:#c8a96e;font-size:13px;letter-spacing:2px;font-weight:700;margin:14px 0 0;">${codigo}</p>
          </div>

          <div style="background:rgba(200,169,110,.06);border:1px solid rgba(200,169,110,.15);border-radius:8px;padding:14px 18px;margin-bottom:24px;">
            <p style="color:#c8a96e;font-size:12px;margin:0;font-weight:600;">
              📎 Tu tiquete digital está adjunto como imagen (Tiquete-${codigo}.png). Ábrelo para verlo completo.
            </p>
          </div>

          <p style="color:#555;font-size:11px;line-height:1.6;margin:0;text-align:center;">
            Presenta este código QR en la entrada. No compartas tu tiquete.
          </p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="color:#333;font-size:11px;margin:0;">Lumina Films © ${new Date().getFullYear()} · Cinema Experience</p>
        </div>
      </div>
    </body></html>`,
    attachments: [
      {
        // QR embebido inline en el cuerpo del correo (CID)
        filename:    'qr-lumina.png',
        content:     qrBuffer,
        cid:         'qr_lumina',
        contentType: 'image/png'
      },
      {
        // Ticket completo como imagen PNG — se ve directamente al abrirlo
        filename:    `Tiquete-${codigo}.png`,
        content:     ticketPNG,
        contentType: 'image/png'
      }
    ]
  });
}

module.exports = { sendPasswordReset, sendTicketConfirmation };
