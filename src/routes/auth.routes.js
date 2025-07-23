const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { obtenerUsuarioPorId } = require('../controllers/usuario.controller');

router.post('/login', usuarioController.login); // Iniciar session usuario
router.post('/register', usuarioController.createUsuario); // Registrar usuario
router.delete('/:id', usuarioController.deleteUsuario); // Eliminar usuario
router.get('/', usuarioController.getUsuarios); // Obtener todos los usuarios
router.put('/update/:id', usuarioController.updateUsuario); // Actualizar datos usuario
router.get('/usuarios/:id', usuarioController.obtenerUsuarioPorId); //ya sabes, no mas explicar de aqui en adelante
router.get('/token', usuarioController.validarToken);

module.exports = router;