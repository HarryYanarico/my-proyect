const express = require('express');
const router = express.Router();
const VentaController = require('../controllers/venta.controller');

// POST /api/ventas
router.post('/', VentaController.crearVenta);
router.get('/', VentaController.listarVentas);
router.get('/:id', VentaController.obtenerVentaPorId);

module.exports = router;
