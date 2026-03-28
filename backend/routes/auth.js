// routes/auth.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.post('/registro',           ctrl.registro);
router.post('/login',              ctrl.login);
router.post('/recuperar-password', ctrl.recuperarPassword);
router.post('/reset-password',     ctrl.resetPassword);
router.get('/usuarios',            authMiddleware, adminOnly, ctrl.getUsuarios);

module.exports = router;
