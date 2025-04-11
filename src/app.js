  
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/usuarios', require('./routes/usuario.routes'));
app.use('/auth', require('./routes/auth.routes'));

module.exports = app;
