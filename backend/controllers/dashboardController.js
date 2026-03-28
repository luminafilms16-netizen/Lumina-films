const db = require('../config/db');

exports.dashboard = async (req, res) => {
  try {
    // Total ventas
    const [[{ total_ventas }]] = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS total_ventas
       FROM tiquetes WHERE estado != 'cancelado'`
    );

    // Tiquetes vendidos
    const [[{ total_tiquetes }]] = await db.query(
      `SELECT COUNT(*) AS total_tiquetes FROM tiquetes WHERE estado != 'cancelado'`
    );

    // Funciones activas (hoy en adelante)
    const [[{ funciones_activas }]] = await db.query(
      `SELECT COUNT(*) AS funciones_activas FROM funciones
       WHERE fecha >= CURDATE() AND estado = 'disponible'`
    );

    // Ocupación por sala
    const [ocupacion] = await db.query(
      `SELECT s.nombre AS sala,
              COUNT(dt.id) AS asientos_vendidos,
              s.capacidad
       FROM salas s
       LEFT JOIN funciones   f  ON f.sala_id = s.id
       LEFT JOIN tiquetes    t  ON t.funcion_id = f.id AND t.estado != 'cancelado'
       LEFT JOIN detalle_tiquete dt ON dt.tiquete_id = t.id
       GROUP BY s.id, s.nombre, s.capacidad`
    );

    // Películas más vistas
    const [top_peliculas] = await db.query(
      `SELECT p.titulo, COUNT(dt.id) AS tiquetes_vendidos, p.imagen_url
       FROM peliculas p
       JOIN funciones f ON f.pelicula_id = p.id
       JOIN tiquetes  t ON t.funcion_id  = f.id AND t.estado != 'cancelado'
       JOIN detalle_tiquete dt ON dt.tiquete_id = t.id
       GROUP BY p.id, p.titulo, p.imagen_url
       ORDER BY tiquetes_vendidos DESC
       LIMIT 5`
    );

    // Ventas por día (últimos 7 días)
    const [ventas_por_dia] = await db.query(
      `SELECT DATE(fecha_compra) AS dia, SUM(total) AS total
       FROM tiquetes
       WHERE estado != 'cancelado' AND fecha_compra >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(fecha_compra)
       ORDER BY dia ASC`
    );

    // Funciones próximas
    const [proximas_funciones] = await db.query(
      `SELECT f.id, f.fecha, f.hora, f.precio, p.titulo AS pelicula, s.nombre AS sala,
              (SELECT COUNT(*) FROM detalle_tiquete dt
               JOIN tiquetes t ON t.id = dt.tiquete_id
               WHERE t.funcion_id = f.id AND t.estado != 'cancelado') AS vendidos
       FROM funciones f
       JOIN peliculas p ON p.id = f.pelicula_id
       JOIN salas     s ON s.id = f.sala_id
       WHERE f.fecha >= CURDATE() AND f.estado = 'disponible'
       ORDER BY f.fecha ASC, f.hora ASC
       LIMIT 10`
    );

    res.json({
      ok: true,
      data: {
        total_ventas,
        total_tiquetes,
        funciones_activas,
        ocupacion,
        top_peliculas,
        ventas_por_dia,
        proximas_funciones
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al obtener datos del dashboard' });
  }
};
