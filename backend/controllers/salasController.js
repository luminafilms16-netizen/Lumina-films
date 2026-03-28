const db = require('../config/db');

exports.listar = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM salas ORDER BY id ASC');
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al obtener salas' });
  }
};
