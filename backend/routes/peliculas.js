const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/peliculasController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/',         ctrl.listar);
router.get('/:id',      ctrl.obtener);
router.post('/',        authMiddleware, adminOnly, ctrl.crear);
router.put('/:id',      authMiddleware, adminOnly, ctrl.editar);
router.delete('/:id',   authMiddleware, adminOnly, ctrl.eliminar);

module.exports = router;
