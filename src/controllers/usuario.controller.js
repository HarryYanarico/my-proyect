const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Usuario = require('../models/usuario.model');

// Obtener todos los usuarios
// Obtener todos los usuarios excepto el que está logeado
exports.getUsuarios = async (req, res) => {
    try {
        // El middleware de autenticación ya ha adjuntado el ID del usuario en req.user
        const loggedInUserId = req.user.id;

        // Modificar la consulta para excluir el ID del usuario logeado
        const [results] = await db.query(
            'SELECT id, nombre, apellido, ci, telefono, email, direccion, cargo FROM empleados WHERE id != ?',
            [loggedInUserId]
        );

        res.json(results);
    } catch (err) {
        console.error('Error al obtener usuarios:', err);
        return res.status(500).json({ error: 'Error al obtener la lista de usuarios.' });
    }
};

// Crear usuario (registrarse)
exports.createUsuario = async (req, res) => {
  const { nombre, apellido, ci, telefono, email, password, direccion } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
  }

  try {
    // Verificar si el email ya está registrado
    const [rows] = await db.query('SELECT id FROM empleados WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar nuevo empleado
    const [result] = await db.query(
      'INSERT INTO empleados (nombre, apellido, ci, telefono, email, password, direccion) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, apellido, ci, telefono, email, hashedPassword, direccion]
    );

    res.status(201).json({
      message: 'Empleado registrado correctamente',
      empleado: {
        id: result.insertId,
        nombre,
        apellido,
        ci,
        telefono,
        email,
        direccion
      }
    });

  } catch (error) {
    console.error('❌ Error al registrar empleado:', error);
    res.status(500).json({ error: 'Error al registrar el empleado.' });
  }
};

// Eliminar un usuario
exports.deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM empleados WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    console.error('❌ Error al eliminar usuario:', err);
    res.status(500).json({ error: err.message });
  }
};

// Método para login:
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [results] = await db.query('SELECT * FROM empleados WHERE email = ?', [email]);

    if (results.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const usuario = results[0];

    const isMatch = await bcrypt.compare(password, usuario.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );
    res.json({
      token,
      id: usuario.id,
      username: usuario.nombre,
      cargo: usuario.cargo
    });

  } catch (err) {
    console.error('❌ Error en login:', err);
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Error en el servidor';
      
    res.status(500).json({ 
      success: false,
      error: errorMessage 
    });
  }
};

// Actualizar un usuario
// ✅ Ya no uses .promise() porque tu db ya es con promesas
exports.updateUsuario = async (req, res) => {
    const { id } = req.params;
    const {
        nombre,
        apellido,
        ci,
        telefono,
        email,
        direccion,
        cargo
    } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE empleados
             SET nombre = ?, apellido = ?, ci = ?, telefono = ?, email = ?, direccion = ?, cargo = ?
             WHERE id = ?`,
            [nombre, apellido, ci, telefono, email, direccion, cargo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario actualizado correctamente' });

    } catch (err) {
        console.error('❌ Error al actualizar usuario:', err.message);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
};



// Método obtener dato usuario por id
exports.obtenerUsuarioPorId = async (req, res) => {
    const { id } = req.params;
    const [filas] = await db.promise().query('SELECT * FROM empleados WHERE id = ?', [id]);  // Corregido: empleados

    if (filas.length > 0) {
        const usuario = Usuario.fromDB(filas[0]);
        res.json(usuario);
    } else {
        res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
};


exports.validarToken = async (req, res) => {
    // Obtener el token del header Authorization
    const cabeceraAutorizacion = req.headers['authorization'];
    const token = cabeceraAutorizacion && cabeceraAutorizacion.split(' ')[1]; // Formato: Bearer <token>

    if (!token) {
        return res.status(401).json({ 
            exito: false,
            error: 'Token no proporcionado' 
        });
    }

    try {
        // Verificar el token
        jwt.verify(token, process.env.JWT_SECRET, (error, tokenDecodificado) => {
            if (error) {
                console.error('❌ Error al verificar token:', error.message);
                
                if (error.name === 'TokenExpiredError') {
                    return res.status(401).json({ 
                        exito: false,
                        error: 'Token expirado' 
                    });
                } else {
                    return res.status(403).json({ 
                        exito: false,
                        error: 'Token inválido' 
                    });
                }
            }
            
            // Si el token es válido
            res.status(200).json({ 
                exito: true,
                mensaje: 'Token válido',
                usuario: {
                    id: tokenDecodificado.id,
                    correo: tokenDecodificado.email
                },
                expiraEn: new Date(tokenDecodificado.exp * 1000) // Convertir timestamp a fecha
            });
        });

    } catch (error) {
        console.error('❌ Error en validación de token:', error);
        res.status(500).json({ 
            exito: false,
            error: 'Error al validar el token' 
        });
    }
};