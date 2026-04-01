const QRCode  = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const db      = require('../config/db');
const { sendTicketConfirmation } = require('../services/emailService');

// ── Comprar tiquetes ──────────────────────────────────────────
exports.comprar = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { funcion_id, asientos_ids } = req.body;
    const usuario_id = req.user?.id || null;

    if (!funcion_id || !asientos_ids?.length)
      return res.status(400).json({ ok: false, message: 'Función y asientos son obligatorios' });

    // Verificar función
    const [funRows] = await conn.query(
      `SELECT f.*, p.titulo AS pelicula, p.imagen_url,
              s.nombre AS sala_nombre
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas     s ON s.id = f.sala_id
       WHERE f.id = ? AND f.estado = 'disponible'`,
      [funcion_id]
    );
    if (!funRows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: 'Función no disponible' });
    }
    const funcion = funRows[0];

    const placeholders = asientos_ids.map(() => '?').join(',');
    const [asientosRows] = await conn.query(
      `SELECT a.id, a.fila, a.columna
       FROM asientos a
       WHERE a.id IN (${placeholders}) AND a.sala_id = ?`,
      [...asientos_ids, funcion.sala_id]
    );

    if (asientosRows.length !== asientos_ids.length) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: 'Algunos asientos no son válidos para esta sala' });
    }

    const [ocupados] = await conn.query(
      `SELECT dt.asiento_id FROM detalle_tiquete dt
       JOIN tiquetes t ON t.id = dt.tiquete_id
       WHERE t.funcion_id = ? AND t.estado != 'cancelado'
         AND dt.asiento_id IN (${placeholders})
       FOR UPDATE`,
      [funcion_id, ...asientos_ids]
    );
    if (ocupados.length) {
      await conn.rollback();
      return res.status(409).json({
        ok: false,
        message: 'Uno o más asientos ya fueron comprados. Selecciona otros.',
        ocupados: ocupados.map(o => o.asiento_id)
      });
    }

    const precio     = parseFloat(funcion.precio);
    const total      = precio * asientos_ids.length;
    const codigo     = `LF-${uuidv4().split('-')[0].toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const [ticketResult] = await conn.query(
      'INSERT INTO tiquetes (codigo, usuario_id, funcion_id, total, estado) VALUES (?, ?, ?, ?, "activo")',
      [codigo, usuario_id, funcion_id, total]
    );
    const tiquete_id = ticketResult.insertId;

    for (const asiento_id of asientos_ids) {
      await conn.query(
        'INSERT INTO detalle_tiquete (tiquete_id, asiento_id, precio_unitario) VALUES (?, ?, ?)',
        [tiquete_id, asiento_id, precio]
      );
    }

    await conn.commit();

    const qrDataUrl = await QRCode.toDataURL(codigo, { width: 200, margin: 1 });

    // Enviar correo en segundo plano — ahora con logs detallados
    if (usuario_id) {
      db.query('SELECT nombre, email FROM usuarios WHERE id = ?', [usuario_id])
        .then(([userRows]) => {
          if (!userRows.length) {
            console.warn(`⚠️  Usuario ${usuario_id} no encontrado para envío de correo.`);
            return;
          }
          const { nombre, email } = userRows[0];
          // Fecha legible
          const fechaStr = new Date(funcion.fecha).toLocaleDateString('es-CO', { dateStyle: 'long' });

          console.log(`📧  Enviando tiquete ${codigo} a ${email}...`);
          sendTicketConfirmation(email, {
            nombre,
            codigo,
            pelicula: funcion.pelicula,
            sala:     funcion.sala_nombre,
            fecha:    fechaStr,
            hora:     funcion.hora,   // emailService.js normaliza el tipo
            asientos: asientosRows,
            total,
            qrDataUrl,
          })
            .then(() => console.log(`✅  Correo enviado a ${email} (tiquete ${codigo})`))
            .catch(mailErr => {
              // Log completo para Railway Logs
              console.error(`❌  Error al enviar correo a ${email} (tiquete ${codigo}):`);
              console.error(mailErr);
            });
        })
        .catch(err => console.error('❌  Error obteniendo usuario para correo:', err));
    }

    res.status(201).json({
      ok: true,
      message: 'Compra realizada exitosamente',
      tiquete: { id: tiquete_id, codigo, total, qr: qrDataUrl }
    });

  } catch (err) {
    await conn.rollback();
    console.error('❌  Error en compra:', err);
    res.status(500).json({ ok: false, message: 'Error al procesar la compra' });
  } finally {
    conn.release();
  }
};

// ── Validar tiquete ───────────────────────────────────────────
exports.validar = async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo)
      return res.status(400).json({ ok: false, message: 'El código es obligatorio' });

    const [rows] = await db.query(
      `SELECT t.*, f.fecha, f.hora, p.titulo AS pelicula, s.nombre AS sala
       FROM tiquetes t
       JOIN funciones f ON f.id = t.funcion_id
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas     s ON s.id = f.sala_id
       WHERE t.codigo = ?`,
      [codigo.trim().toUpperCase()]
    );

    if (!rows.length)
      return res.status(404).json({ ok: false, estado: 'invalido', message: 'Tiquete no encontrado' });

    const tiquete = rows[0];

    if (tiquete.estado === 'usado')
      return res.json({ ok: false, estado: 'usado', message: 'Este tiquete ya fue utilizado', tiquete });

    if (tiquete.estado === 'cancelado')
      return res.json({ ok: false, estado: 'invalido', message: 'Este tiquete fue cancelado', tiquete });

    await db.query('UPDATE tiquetes SET estado = "usado" WHERE id = ?', [tiquete.id]);

    const [asientos] = await db.query(
      `SELECT a.fila, a.columna FROM detalle_tiquete dt
       JOIN asientos a ON a.id = dt.asiento_id
       WHERE dt.tiquete_id = ?`,
      [tiquete.id]
    );

    res.json({ ok: true, estado: 'valido', message: '✅ Tiquete válido. Acceso permitido.', tiquete: { ...tiquete, asientos } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al validar tiquete' });
  }
};

// ── Historial de tiquetes del usuario ────────────────────────
exports.misTiquetes = async (req, res) => {
  try {
    const [tiquetes] = await db.query(
      `SELECT t.id, t.codigo, t.total, t.estado, t.fecha_compra,
              p.titulo AS pelicula, p.imagen_url,
              f.fecha AS funcion_fecha, f.hora AS funcion_hora,
              s.nombre AS sala
       FROM tiquetes t
       JOIN funciones f ON f.id = t.funcion_id
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas     s ON s.id = f.sala_id
       WHERE t.usuario_id = ?
       ORDER BY t.fecha_compra DESC`,
      [req.user.id]
    );
    res.json({ ok: true, data: tiquetes });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener tiquetes' });
  }
};

// ── Detalle de un tiquete (asientos) ─────────────────────────
exports.detalle = async (req, res) => {
  try {
    const { id } = req.params;
    const [asientos] = await db.query(
      `SELECT a.fila, a.columna, a.numero FROM detalle_tiquete dt
       JOIN asientos a ON a.id = dt.asiento_id
       WHERE dt.tiquete_id = ? AND dt.tiquete_id IN (
         SELECT id FROM tiquetes WHERE usuario_id = ?
       )`,
      [id, req.user.id]
    );
    res.json({ ok: true, data: asientos });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener asientos' });
  }
};