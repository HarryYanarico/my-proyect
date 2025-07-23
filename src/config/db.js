const mysql = require('mysql2/promise'); // Importamos la versión con promises
require('dotenv').config();

// Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificar conexión
pool.getConnection()
  .then(connection => {
    console.log('✅ Conectado a MySQL');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err);
  });

module.exports = pool;