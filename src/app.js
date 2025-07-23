const express = require('express');
const cors = require('cors');
require('dotenv').config();


//const listEndpoints = require('express-list-endpoints');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/auth', require('./routes/auth.routes'));
app.use('/api/ventas', require('./routes/venta.routes'));
app.use('/api/lotes', require('./routes/lotes.routes'));
app.use('/api/clientes', require('./routes/cliente.routes'));
app.use('/api/pago_venta', require('./routes/pago.routes.js'));
app.use('/api', require('./routes/dashboard.routes.js'));
//console.log('=== RUTAS REGISTRADAS ==='); //esto para ver las rutas
//console.log(listEndpoints(app));
module.exports = app;
