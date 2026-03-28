// salas.js
const express = require('express');
const rSalas  = express.Router();
const sCtrl   = require('../controllers/salasController');
rSalas.get('/', sCtrl.listar);

// dashboard.js
const rDash   = express.Router();
const dCtrl   = require('../controllers/dashboardController');
const { authMiddleware, adminOnly } = require('../middleware/auth');
rDash.get('/', authMiddleware, adminOnly, dCtrl.dashboard);

module.exports = { rSalas, rDash };
