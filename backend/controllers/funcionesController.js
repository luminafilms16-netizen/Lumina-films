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

// ── Crear función (con validación de traslape) ────────────────
exports.crear = async (req, res) => {
  try {
    const { pelicula_id, sala_id, fecha, hora, precio, estado } = req.body;
    if (!pelicula_id || !sala_id || !fecha || !hora || !precio)
      return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios' });

    // Obtener duración de la película para calcular fin de función
    const [peliRows] = await db.query('SELECT duracion FROM peliculas WHERE id = ?', [pelicula_id]);
    if (!peliRows.length)
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });

    // Verificar traslape en la misma sala y fecha
    // Una función A traslapa con B si: A.inicio < B.fin Y A.fin > B.inicio
    const duracion = peliRows[0].duracion; // minutos

    const [traslape] = await db.query(
      `SELECT f.id, p.titulo AS pelicula, f.hora
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       WHERE f.sala_id = ? AND f.fecha = ? AND f.estado = 'disponible'
         AND (
           TIME_TO_SEC(?) < TIME_TO_SEC(f.hora) + (p.duracion * 60) + 900
           AND TIME_TO_SEC(?) + (? * 60) + 900 > TIME_TO_SEC(f.hora)
         )`,
      [sala_id, fecha, hora, hora, duracion]
    );

    if (traslape.length) {
      const conflictos = traslape.map(t => `"${t.pelicula}" a las ${t.hora}`).join(', ');
      return res.status(409).json({
        ok: false,
        message: `Conflicto de horario con: ${conflictos} (incluye 15 min de limpieza)`,
        conflictos: traslape
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

// ── Editar función (admin) ────────────────────────────────────
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { pelicula_id, sala_id, fecha, hora, precio, estado } = req.body;
    if (!pelicula_id || !sala_id || !fecha || !hora || !precio)
      return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios' });

    const [peliRows] = await db.query('SELECT duracion FROM peliculas WHERE id = ?', [pelicula_id]);
    if (!peliRows.length)
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });

    const duracion = peliRows[0].duracion;

    // Verificar traslape excluyendo la función actual
    const [traslape] = await db.query(
      `SELECT f.id, p.titulo AS pelicula, f.hora, f.fecha
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       WHERE f.sala_id = ? AND f.fecha = ? AND f.estado = 'disponible' AND f.id != ?
         AND (
           TIME_TO_SEC(?) < TIME_TO_SEC(f.hora) + (p.duracion * 60) + 900
           AND TIME_TO_SEC(?) + (? * 60) + 900 > TIME_TO_SEC(f.hora)
         )`,
      [sala_id, fecha, id, hora, hora, duracion]
    );

    if (traslape.length) {
      const conflictos = traslape.map(t => `"${t.pelicula}" a las ${t.hora}`).join(', ');
      return res.status(409).json({
        ok: false,
        message: `Conflicto de horario con: ${conflictos} (incluye 15 min de limpieza)`,
        conflictos: traslape
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
