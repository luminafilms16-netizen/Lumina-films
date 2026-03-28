const db = require('../config/db');

// ── Listar películas ──────────────────────────────────────────
exports.listar = async (req, res) => {
  try {
    const soloActivas = req.query.activas === '1';
    const query = soloActivas
      ? 'SELECT * FROM peliculas WHERE estado = "activa" ORDER BY fecha_creacion DESC'
      : 'SELECT * FROM peliculas ORDER BY fecha_creacion DESC';
    const [rows] = await db.query(query);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al obtener películas' });
  }
};

// ── Obtener una película ──────────────────────────────────────
exports.obtener = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM peliculas WHERE id = ?', [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener película' });
  }
};

// ── Crear película ────────────────────────────────────────────
exports.crear = async (req, res) => {
  try {
    const { titulo, descripcion, duracion, genero, clasificacion, imagen_url, trailer_url, estado } = req.body;
    if (!titulo || !descripcion || !duracion || !genero || !clasificacion)
      return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios' });

    const [result] = await db.query(
      `INSERT INTO peliculas (titulo, descripcion, duracion, genero, clasificacion, imagen_url, trailer_url, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [titulo, descripcion, parseInt(duracion), genero, clasificacion,
       imagen_url || null, trailer_url || null, estado || 'activa']
    );
    res.status(201).json({ ok: true, message: 'Película creada', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al crear película' });
  }
};

// ── Editar película ───────────────────────────────────────────
exports.editar = async (req, res) => {
  try {
    const { titulo, descripcion, duracion, genero, clasificacion, imagen_url, trailer_url, estado } = req.body;
    const { id } = req.params;

    const [exists] = await db.query('SELECT id FROM peliculas WHERE id = ?', [id]);
    if (!exists.length)
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });

    await db.query(
      `UPDATE peliculas SET titulo=?, descripcion=?, duracion=?, genero=?, clasificacion=?,
       imagen_url=?, trailer_url=?, estado=? WHERE id=?`,
      [titulo, descripcion, parseInt(duracion), genero, clasificacion,
       imagen_url || null, trailer_url || null, estado || 'activa', id]
    );
    res.json({ ok: true, message: 'Película actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al actualizar película' });
  }
};

// ── Eliminar película ─────────────────────────────────────────
exports.eliminar = async (req, res) => {
  try {
    const [exists] = await db.query('SELECT id FROM peliculas WHERE id = ?', [req.params.id]);
    if (!exists.length)
      return res.status(404).json({ ok: false, message: 'Película no encontrada' });

    await db.query('DELETE FROM peliculas WHERE id = ?', [req.params.id]);
    res.json({ ok: true, message: 'Película eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al eliminar película' });
  }
};
