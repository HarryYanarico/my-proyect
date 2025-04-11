const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const authMiddleware = require('../middlewares/auth');

router.get('/', authMiddleware, usuarioController.getUsuarios);

// router.get('/', usuarioController.getUsuarios);
router.post('/', usuarioController.createUsuario);
router.delete('/:id', usuarioController.deleteUsuario);


module.exports = router;
