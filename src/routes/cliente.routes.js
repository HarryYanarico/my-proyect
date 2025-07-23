const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');
const authMiddleware = require('../middlewares/auth');

router.post('/', clienteController.registrarCliente);         // Crear un cliente
router.get('/', clienteController.obtenerClientes);        // Listar todos los clientes
router.get('/:id_cliente',clienteController.obtenerClientePorId);      // Buscar cliente por ID
router.put('/:id_cliente', clienteController.actualizar_cliente); // Actualizar cliente por ID
router.delete('/:id', clienteController.eliminarCliente); // Eliminar cliente por ID
router.get('/buscar/ci/:ci', clienteController.buscarClientesPorCI); // Buscar clientes por nombre
router.get('/cliente-detalles/:id_cliente', clienteController.obtenerDetallesCliente);
module.exports = router;