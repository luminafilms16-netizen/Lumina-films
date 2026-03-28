// ── funciones.js ───────────────────────────────────────────────
const express  = require('express');
const router   = express.Router();
const fCtrl    = require('../controllers/funcionesController');
const aCtrl    = require('../controllers/asientosController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/',         fCtrl.listar);
router.get('/admin',    authMiddleware, adminOnly, fCtrl.listarAdmin);
router.get('/:id',      fCtrl.obtener);
router.post('/',        authMiddleware, adminOnly, fCtrl.crear);
router.put('/:id',      authMiddleware, adminOnly, fCtrl.editar);
router.get('/:id/asientos', aCtrl.porFuncion);

module.exports = router;
