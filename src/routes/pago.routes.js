// src/routes/pago.routes.js
const express = require('express');
const router = express.Router();
const PagoController = require('../controllers/pago.controller');
// const authMiddleware = require('../middlewares/auth');

// Registrar nuevo pago
router.post('/pagos', PagoController.registrarPago);

// Obtener pago específico
router.get('/pagos/:id', PagoController.obtenerPago);

// Listar pagos por cuota
router.get('/cuotas/:id_cuota/pagos', PagoController.listarPagosPorCuota);

// Listar pagos por venta
router.get('/ventas/:id_venta/pagos', PagoController.listarPagosPorVenta);

// Actualizar pago (solo datos no críticos)
router.patch('/pagos/:id', PagoController.actualizarPago);

// Eliminar pago
router.delete('/pagos/:id', PagoController.eliminarPago);

router.get('/lotes/:id_lote/cuotas-pendientes', PagoController.listarCuotasPendientesPorLote);

router.get('/pagos', PagoController.listarUltimosPagos);

module.exports = router;