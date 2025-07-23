const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const authMiddleware = require('../middlewares/auth');

router.get('/', authMiddleware, usuarioController.getUsuarios);

// router.get('/empleados', usuarioController.getUsuarios);
router.get('/empleados', authMiddleware, usuarioController.getUsuarios);
router.post('/', usuarioController.createUsuario);
// router.delete('/:id', usuarioController.deleteUsuario);
router.post('/login', usuarioController.login); // Nueva ruta
router.post('/register', usuarioController.createUsuario); // Reusa tu método existente
// router.put('/:id', authMiddleware, usuarioController.updateUsuario);
router.put('/empleados/:id', usuarioController.updateUsuario);
module.exports = router;