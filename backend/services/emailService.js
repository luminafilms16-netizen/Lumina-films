/**
 * emailService.js – Lumina Films
 *
 * Soporta tres proveedores según las variables de entorno:
 *   • Brevo   → define BREVO_API_KEY         (recomendado en Railway)
 *   • Resend  → define RESEND_API_KEY
 *   • SMTP    → define SMTP_HOST + SMTP_USER + SMTP_PASS  (Nodemailer)
 *
 * Si ninguno está configurado, lanza un error explícito al arrancar.
 */

const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
require('dotenv').config();

// ─── Selección de transporte ──────────────────────────────────────────────────

let sendMail; // función unificada: sendMail({ from, to, subject, html, attachments })

if (process.env.BREVO_API_KEY) {
  // ── Brevo API HTTP ──────────────────────────────────────────────────────────
  sendMail = async ({ from, to, subject, html, attachments = [] }) => {
    const body = {
      sender:      { name: 'Lumina Films', email: from.match(/<(.+)>/)?.[1] ?? from },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
    };

    if (attachments.length) {
      body.attachment = attachments.map(a => ({
        name:    a.filename,
        content: Buffer.isBuffer(a.content)
          ? a.content.toString('base64')
          : a.content,
      }));
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'api-key':      process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Brevo error: ${JSON.stringify(err)}`);
    }
    return res.json();
  };

  console.log('📧  Email provider: Brevo API');

} else if (process.env.RESEND_API_KEY) {
  // ── Resend ──────────────────────────────────────────────────────────────────
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  sendMail = async ({ from, to, subject, html, attachments = [] }) => {
    const result = await resend.emails.send({ from, to, subject, html, attachments });
    if (result.error) throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
    return result;
  };

  console.log('📧  Email provider: Resend');

} else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  // ── Nodemailer / SMTP ───────────────────────────────────────────────────────
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  sendMail = async ({ from, to, subject, html, attachments = [] }) => {
    const nmAttachments = attachments.map(a => ({
      filename: a.filename,
      content:  Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content, 'base64'),
    }));
    return transporter.sendMail({ from, to, subject, html, attachments: nmAttachments });
  };

  console.log('📧  Email provider: SMTP Nodemailer');

} else {
  // ── Sin configuración ───────────────────────────────────────────────────────
  console.warn('⚠️  EMAIL NO CONFIGURADO: define BREVO_API_KEY, RESEND_API_KEY o SMTP_HOST+SMTP_USER+SMTP_PASS en las variables de entorno.');
  sendMail = async () => { throw new Error('Servicio de email no configurado.'); };
}

// ─── Helper: normalizar hora ──────────────────────────────────────────────────
function formatHora(hora) {
  if (!hora) return '';
  if (typeof hora === 'string') return hora.substring(0, 5);
  if (typeof hora === 'object') {
    const h = String(hora.hours   ?? hora.h ?? 0).padStart(2, '0');
    const m = String(hora.minutes ?? hora.m ?? 0).padStart(2, '0');
    return `${h}:${m}`;
  }
  return String(hora);
}

// ─── Generación del ticket PNG ────────────────────────────────────────────────
async function generateTicketPNG(ticketData) {
  const { nombre, codigo, pelicula, sala, fecha, total, asientos } = ticketData;
  const hora = formatHora(ticketData.hora);

  const W = 520, H = 580;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fondo
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#181510');
  bgGrad.addColorStop(1, '#0e0c09');
  ctx.fillStyle = bgGrad;
  roundRect(ctx, 0, 0, W, H, 16); ctx.fill();

  // Borde dorado
  ctx.strokeStyle = 'rgba(200,169,110,0.25)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 0, 0, W, H, 16); ctx.stroke();

  // Header dorado
  const hdrGrad = ctx.createLinearGradient(0, 0, W, 0);
  hdrGrad.addColorStop(0,   '#c8a96e');
  hdrGrad.addColorStop(0.5, '#e8c97e');
  hdrGrad.addColorStop(1,   '#b8913e');
  ctx.fillStyle = hdrGrad;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(W - 16, 0);
  ctx.quadraticCurveTo(W, 0, W, 16);
  ctx.lineTo(W, 80); ctx.lineTo(0, 80); ctx.lineTo(0, 16);
  ctx.quadraticCurveTo(0, 0, 16, 0);
  ctx.closePath(); ctx.fill(); ctx.restore();

  ctx.fillStyle = '#0a0800';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('LUMINA FILMS', 32, 46);
  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText('CINEMA EXPERIENCE', 32, 62);

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, W - 120, 24, 88, 24, 12); ctx.fill();
  ctx.fillStyle = '#0a0800';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('E-TICKET', W - 76, 40);
  ctx.textAlign = 'left';

  // Sección película
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 80, W, 72);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px Arial';
  const tituloText = pelicula.length > 38 ? pelicula.substring(0, 38) + '…' : pelicula;
  ctx.fillText(tituloText, 32, 116);
  ctx.fillStyle = '#c8a96e';
  ctx.font = 'bold 11px Arial';
  ctx.fillText(`ENTRADA CONFIRMADA  ·  ${asientos.length} ${asientos.length === 1 ? 'ASIENTO' : 'ASIENTOS'}`, 32, 138);

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(0, 152); ctx.lineTo(W, 152); ctx.stroke();
  ctx.setLineDash([]);

  // Datos
  const drawField = (label, value, x, y) => {
    ctx.fillStyle = '#555555'; ctx.font = 'bold 10px Arial'; ctx.fillText(label, x, y);
    ctx.fillStyle = '#dddddd'; ctx.font = '600 14px Arial'; ctx.fillText(value, x, y + 18);
  };
  drawField('SALA',      sala,  32,  188);
  drawField('FECHA',     fecha, 200, 188);
  drawField('HORA',      hora,  32,  242);
  drawField('COMPRADOR', nombre.length > 22 ? nombre.substring(0, 22) + '…' : nombre, 200, 242);

  // Asientos
  ctx.fillStyle = '#555555'; ctx.font = 'bold 10px Arial'; ctx.fillText('ASIENTOS', 32, 376);
  let sx = 32;
  asientos.forEach(a => {
    const label = `${a.fila}${a.columna}`;
    const bw = label.length * 9 + 16;
    ctx.fillStyle = 'rgba(200,169,110,0.12)';
    roundRect(ctx, sx, 382, bw, 22, 4); ctx.fill();
    ctx.strokeStyle = '#c8a96e'; ctx.lineWidth = 0.8;
    roundRect(ctx, sx, 382, bw, 22, 4); ctx.stroke();
    ctx.fillStyle = '#c8a96e'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText(label, sx + bw / 2, 396); ctx.textAlign = 'left';
    sx += bw + 6;
  });

  // Separador
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(0, 428); ctx.lineTo(W, 428); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath(); ctx.arc(-1, 428, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W + 1, 428, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 428, W, H - 428);

  // QR
  const qrDataUrl = await QRCode.toDataURL(codigo, { width: 160, margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' } });
  const qrImg = await loadImage(qrDataUrl);
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, W - 198, 440, 166, 126, 8); ctx.fill();
  ctx.drawImage(qrImg, W - 195, 443, 160, 120);
  ctx.fillStyle = '#444444'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('ESCANEAR EN ENTRADA', W - 115, 577); ctx.textAlign = 'left';

  // Código, total, footer
  ctx.fillStyle = '#c8a96e'; ctx.font = 'bold 11px Arial'; ctx.fillText(codigo, 32, 462);
  ctx.fillStyle = '#444444'; ctx.font = 'bold 10px Arial'; ctx.fillText('TOTAL PAGADO', 32, 490);
  ctx.fillStyle = '#c8a96e'; ctx.font = 'bold 22px Arial';
  ctx.fillText(`$${Number(total).toLocaleString('es-CO')}`, 32, 516);
  ctx.fillStyle = '#333333'; ctx.font = '10px Arial';
  ctx.fillText(`Lumina Films © ${new Date().getFullYear()}`, 32, 565);

  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Recuperación de contraseña ───────────────────────────────────────────────
async function sendPasswordReset(toEmail, nombre, resetLink) {
  const from = process.env.EMAIL_FROM || 'Lumina Films <onboarding@resend.dev>';
  await sendMail({
    from,
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
  const { nombre, codigo, pelicula, sala, fecha, asientos, total } = ticketData;
  const hora = formatHora(ticketData.hora);

  const qrBuffer  = await QRCode.toBuffer(codigo, { width: 200, margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' } });
  const ticketPNG = await generateTicketPNG({ ...ticketData, hora });

  const asientosHtml = asientos
    .map(a => `<span style="background:#222;border:1px solid #333;padding:4px 10px;border-radius:4px;color:#c8a96e;font-weight:700;margin:2px;display:inline-block;">${a.fila}${a.columna}</span>`)
    .join(' ');

  const from = process.env.EMAIL_FROM || 'Lumina Films <onboarding@resend.dev>';

  await sendMail({
    from,
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
          <div style="background:rgba(200,169,110,.06);border:1px solid rgba(200,169,110,.15);border-radius:8px;padding:14px 18px;margin-bottom:24px;">
            <p style="color:#c8a96e;font-size:12px;margin:0;font-weight:600;">
              📎 Tu tiquete digital está adjunto como imagen (Tiquete-${codigo}.png).
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
      { filename: `QR-${codigo}.png`,      content: qrBuffer.toString('base64') },
      { filename: `Tiquete-${codigo}.png`, content: ticketPNG.toString('base64') },
    ]
  });
}

module.exports = { sendPasswordReset, sendTicketConfirmation };