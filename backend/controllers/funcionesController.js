const db = require('../config/db');

// ── Listar funciones ──────────────────────────────────────────
exports.listar = async (req, res) => {
  try {
    const { pelicula_id } = req.query;
    let query = `
      SELECT f.*, p.titulo AS pelicula, p.imagen_url, p.duracion AS duracion_min,
             s.nombre AS sala_nombre
      FROM funciones f
      JOIN peliculas p ON p.id = f.pelicula_id
      JOIN salas     s ON s.id = f.sala_id
      WHERE f.estado = 'disponible'`;
    const params = [];

    if (pelicula_id) {
      query += ' AND f.pelicula_id = ?';
      params.push(pelicula_id);
    }
    query += ' ORDER BY f.fecha ASC, f.hora ASC';

    const [rows] = await db.query(query, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al obtener funciones' });
  }
};

// ── Obtener una función ───────────────────────────────────────
exports.obtener = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.*, p.titulo AS pelicula, p.imagen_url, p.duracion AS duracion_min,
              s.nombre AS sala_nombre
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas     s ON s.id = f.sala_id
       WHERE f.id = ?`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ ok: false, message: 'Función no encontrada' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener función' });
  }
};

// ── Helpers de tiempo ─────────────────────────────────────────
function timeToSec(t) {
  const parts = String(t).split(':').map(Number);
  return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
}

function hayTraslape(inicioA, duracionA, inicioB, duracionB) {
  const finA = inicioA + duracionA * 60 + 900;
  const finB = inicioB + duracionB * 60 + 900;
  return inicioA < finB && finA > inicioB;
}

// ── Validación de hora futura ─────────────────────────────────
function esFuturaValida(fecha, hora, clienteNow, clienteOffset) {
  const ahoraUTC = new Date(clienteNow).getTime();
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [h, m]           = hora.split(':').map(Number);
  const funcionUTC = Date.UTC(anio, mes - 1, dia, h, m, 0) + (clienteOffset * 60 * 1000);
  const minimoFuturo = ahoraUTC + 24 * 60 * 60 * 1000;
  return funcionUTC >= minimoFuturo;
}

// ── Crear función ─────────────────────────────────────────────
exports.crear = async (req, res) => {
  try {
    const { pelicula_id, sala_id, fecha, hora, precio, estado, cliente_now, cliente_offset } = req.body;
    if (!pelicula_id || !sala_id || !fecha || !hora || !precio)
      return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios' });

    if (cliente_now && typeof cliente_offset === 'number') {
      if (!esFuturaValida(fecha, hora, cliente_now, cliente_offset)) {
        return res.status(400).json({
          ok: false,
          message: 'La función debe programarse con al menos 24 horas de anticipación respecto a la hora actual.'
        });
      }
    }

    const [peliRows] = await db.query('SELECT duracion FROM peliculas WHERE id = ?', [pelicula_id]);
    if (!peliRows.length)
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });

    const duracionNueva = peliRows[0].duracion;
    const inicioNueva   = timeToSec(hora);

    const [funcionesExistentes] = await db.query(
      `SELECT f.id, f.hora, p.titulo AS pelicula, p.duracion
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       WHERE f.sala_id = ? AND f.fecha = ? AND f.estado = 'disponible'`,
      [sala_id, fecha]
    );

    const conflictos = funcionesExistentes.filter(f =>
      hayTraslape(inicioNueva, duracionNueva, timeToSec(f.hora), f.duracion)
    );

    if (conflictos.length) {
      const lista = conflictos.map(f => `"${f.pelicula}" a las ${String(f.hora).substring(0, 5)}`).join(', ');
      return res.status(409).json({
        ok: false,
        message: `Conflicto de horario con: ${lista} (incluye 15 min de limpieza)`,
        conflictos
      });
    }

    const [result] = await db.query(
      `INSERT INTO funciones (pelicula_id, sala_id, fecha, hora, precio, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pelicula_id, sala_id, fecha, hora, parseFloat(precio), estado || 'disponible']
    );

    res.status(201).json({ ok: true, message: 'Función creada', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al crear función' });
  }
};

// ── Editar función ────────────────────────────────────────────
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { pelicula_id, sala_id, fecha, hora, precio, estado, cliente_now, cliente_offset } = req.body;
    if (!pelicula_id || !sala_id || !fecha || !hora || !precio)
      return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios' });

    if (cliente_now && typeof cliente_offset === 'number') {
      if (!esFuturaValida(fecha, hora, cliente_now, cliente_offset)) {
        return res.status(400).json({
          ok: false,
          message: 'La función debe programarse con al menos 24 horas de anticipación respecto a la hora actual.'
        });
      }
    }

    const [peliRows] = await db.query('SELECT duracion FROM peliculas WHERE id = ?', [pelicula_id]);
    if (!peliRows.length)
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });

    const duracionNueva = peliRows[0].duracion;
    const inicioNueva   = timeToSec(hora);

    const [funcionesExistentes] = await db.query(
      `SELECT f.id, f.hora, p.titulo AS pelicula, p.duracion
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       WHERE f.sala_id = ? AND f.fecha = ? AND f.estado = 'disponible' AND f.id != ?`,
      [sala_id, fecha, id]
    );

    const conflictos = funcionesExistentes.filter(f =>
      hayTraslape(inicioNueva, duracionNueva, timeToSec(f.hora), f.duracion)
    );

    if (conflictos.length) {
      const lista = conflictos.map(f => `"${f.pelicula}" a las ${String(f.hora).substring(0, 5)}`).join(', ');
      return res.status(409).json({
        ok: false,
        message: `Conflicto de horario con: ${lista} (incluye 15 min de limpieza)`,
        conflictos
      });
    }

    await db.query(
      `UPDATE funciones SET pelicula_id=?, sala_id=?, fecha=?, hora=?, precio=?, estado=? WHERE id=?`,
      [pelicula_id, sala_id, fecha, hora, parseFloat(precio), estado || 'disponible', id]
    );

    res.json({ ok: true, message: 'Función actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al actualizar función' });
  }
};

// ── Listar todas las funciones (admin) ────────────────────────
exports.listarAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.*, p.titulo AS pelicula, s.nombre AS sala_nombre,
              (SELECT COUNT(*) FROM detalle_tiquete dt
               JOIN tiquetes t ON t.id = dt.tiquete_id
               WHERE t.funcion_id = f.id AND t.estado != 'cancelado') AS asientos_vendidos
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas     s ON s.id = f.sala_id
       ORDER BY f.fecha DESC, f.hora DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener funciones' });
  }
};

// ── Eliminar función (admin, solo si es pasada) ───────────────
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT f.fecha, f.hora FROM funciones f WHERE f.id = ?`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ ok: false, message: 'Función no encontrada' });

    const { fecha, hora } = rows[0];
    const ahora = new Date();
    const [anio, mes, dia] = String(fecha).substring(0, 10).split('-').map(Number);
    const [h, m] = String(hora).substring(0, 5).split(':').map(Number);
    const fechaHoraFuncion = new Date(anio, mes - 1, dia, h, m, 0);

    if (fechaHoraFuncion >= ahora) {
      return res.status(400).json({
        ok: false,
        message: 'Solo se pueden eliminar funciones cuya fecha y hora ya hayan pasado.'
      });
    }

    await db.query('DELETE FROM funciones WHERE id = ?', [id]);
    res.json({ ok: true, message: 'Función eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al eliminar función' });
  }
};