const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    
    if (!token) return res.status(401).json({ error: "Acceso denegado:Token Requerido" });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Añade los datos del usuario al request
        next();
    } catch (err) {
        res.status(400).json({ error: "Token inválido o expirado" });
    }
};