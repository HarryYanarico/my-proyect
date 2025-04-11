const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')

// Obtener todos los usuarios
exports.getUsuarios = (req, res) => {
    db.query('SELECT id, nombre, email FROM usuarios', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

// Crear usuario (registrarse)
exports.createUsuario = async (req, res) => {
    const { nombre, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    db.query('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
        [nombre, email, hashedPassword], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, nombre, email });
        }
    );
};

// Eliminar un usuario
exports.deleteUsuario = (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Usuario eliminado' });
    });
};

// Método para login:
exports.login = async (req, res) => {
    const { email, password } = req.body;

    // 1. Buscar usuario en la DB
    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(400).json({ error: "Usuario no encontrado" });

        const usuario = results[0];

        // 2. Comparar contraseñas hasheadas
        const isMatch = await bcrypt.compare(password, usuario.password);
        if (!isMatch) return res.status(400).json({ error: "Contraseña incorrecta" });

        // 3. Generar token JWT (añade esto en tu .env: JWT_SECRET=mi_clave_secreta)
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    });
};