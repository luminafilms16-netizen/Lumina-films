const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const db       = require('../config/db');
const { sendPasswordReset } = require('../services/emailService');
require('dotenv').config();

// ── Listar usuarios (admin) ───────────────────────────────────
exports.getUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, email, rol, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error al obtener usuarios' });
  }
};

// ── Registro ──────────────────────────────────────────────────
exports.registro = async (req, res) => {
  try {
    const { nombre, email, password, confirmPassword, rol } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !password || !confirmPassword)
      return res.status(400).json({ ok: false, message: 'Todos los campos son obligatorios' });

    if (password !== confirmPassword)
      return res.status(400).json({ ok: false, message: 'Las contraseñas no coinciden' });

    if (password.length < 8)
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 8 caracteres' });

    // Email único
    const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.length)
      return res.status(409).json({ ok: false, message: 'El correo ya está registrado' });

    const rolFinal = 'cliente'; // Solo clientes se registran; el admin está predefinido
    const hash     = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre.trim(), email.toLowerCase().trim(), hash, rolFinal]
    );

    res.status(201).json({ ok: true, message: 'Usuario registrado correctamente', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// ── Login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ ok: false, message: 'Email y contraseña son obligatorios' });

    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
    if (!rows.length)
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ ok: false, message: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '24h' }
    );

    res.json({
      ok: true,
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// ── Solicitar recuperación ────────────────────────────────────
exports.recuperarPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ ok: false, message: 'El email es obligatorio' });

    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
    // Siempre respondemos OK para no revelar si el email existe
    if (!rows.length)
      return res.json({ ok: true, message: 'Si el correo existe, recibirás un enlace.' });

    const user     = rows[0];
    const token    = crypto.randomBytes(32).toString('hex');
    const expires  = new Date(Date.now() + 3600000); // 1 hora

    await db.query(
      'UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [token, expires, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/pages/reset-password.html?token=${token}`;
    await sendPasswordReset(user.email, user.nombre, resetLink);

    res.json({ ok: true, message: 'Si el correo existe, recibirás un enlace.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};

// ── Resetear contraseña ───────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword)
      return res.status(400).json({ ok: false, message: 'Todos los campos son obligatorios' });

    if (password !== confirmPassword)
      return res.status(400).json({ ok: false, message: 'Las contraseñas no coinciden' });

    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE reset_token = ? AND reset_expires > NOW()',
      [token]
    );
    if (!rows.length)
      return res.status(400).json({ ok: false, message: 'Token inválido o expirado' });

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE usuarios SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
      [hash, rows[0].id]
    );

    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
};
