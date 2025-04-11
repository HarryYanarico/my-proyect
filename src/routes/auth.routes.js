const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

router.post('/login', usuarioController.login); // Nueva ruta
router.post('/register', usuarioController.createUsuario); // Reusa tu método existente

module.exports = router;