const db = require('../config/db');

/**
 * Devuelve los 150 asientos de una función con su estado:
 *  - disponible: no comprado
 *  - ocupado:    ya hay tiquete activo/usado para ese asiento en esa función
 */
exports.porFuncion = async (req, res) => {
  try {
    const { id: funcion_id } = req.params;

    // Verificar que la función existe
    const [funRows] = await db.query('SELECT sala_id FROM funciones WHERE id = ?', [funcion_id]);
    if (!funRows.length)
      return res.status(404).json({ ok: false, message: 'Función no encontrada' });

    const sala_id = funRows[0].sala_id;

    // Todos los asientos de la sala con su estado
    const [asientos] = await db.query(
      `SELECT a.id, a.fila, a.columna, a.numero,
              CASE
                WHEN dt.id IS NOT NULL THEN 'ocupado'
                ELSE 'disponible'
              END AS estado
       FROM asientos a
       LEFT JOIN detalle_tiquete dt ON dt.asiento_id = a.id
       LEFT JOIN tiquetes t ON t.id = dt.tiquete_id AND t.funcion_id = ? AND t.estado != 'cancelado'
       WHERE a.sala_id = ? AND a.estado = 'activo'
       ORDER BY a.fila, a.columna`,
      [funcion_id, sala_id]
    );

    res.json({ ok: true, sala_id, data: asientos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al obtener asientos' });
  }
};
