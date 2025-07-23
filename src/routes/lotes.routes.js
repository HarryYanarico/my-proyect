const express = require('express');
const router = express.Router();
const loteController = require('../controllers/lote.controller');

// Rutas de lotes
router.post('/', loteController.crearLote);         // Crear un lote
router.get('/', loteController.listarLotes);        // Listar todos los lotes
router.get('/:id', loteController.buscarLote);      // Buscar lote por ID
router.get('/buscar/nombre', loteController.buscarLotesPorNombre);
router.put('/editar/:id', loteController.modificarLote); // Actualizar lote por ID
router.get('/cliente/:ci_nit', loteController.listarLotesConCredito);

module.exports = router;
