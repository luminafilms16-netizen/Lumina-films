const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/tiquetesController');
const { authMiddleware } = require('../middleware/auth');

router.post('/',          authMiddleware, ctrl.comprar);
router.post('/validar',   ctrl.validar);
router.get('/mis-tiquetes', authMiddleware, ctrl.misTiquetes);
router.get('/:id/asientos', authMiddleware, ctrl.detalle);

module.exports = router;
