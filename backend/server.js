require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const app = express();

// ── Middlewares globales ──────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Servir frontend estático ──────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Rutas API ─────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/peliculas', require('./routes/peliculas'));
app.use('/api/funciones', require('./routes/funciones'));
app.use('/api/tiquetes',  require('./routes/tiquetes'));

const { rSalas, rDash } = require('./routes/extras');
app.use('/api/salas',     rSalas);
app.use('/api/dashboard', rDash);

// ── Ruta catch-all → index.html ───────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Manejo de errores global ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ ok: false, message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎬  Lumina Films corriendo en http://localhost:${PORT}`);
});
