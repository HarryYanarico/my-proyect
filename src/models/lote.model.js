const pool = require('../config/db'); // Asegúrate de que la ruta sea correcta
const Ubicacion = require('./ubicacion.model'); // Asegúrate de que la ruta sea correcta

class Lote {
  constructor({ 
    id_lote, 
    nombre, 
    area, 
    precio, 
    estado = 'disponible', 
    descripcion = '',
    // Campos para la ubicación (ya no necesitamos desestructurarlos aquí)
    id_ubicacion,
    // Campos adicionales del JOIN que no usaremos directamente
    ...rest 
  }) {
    this.id_lote = Number(id_lote);
    this.nombre = nombre;
    this.area = Number(area);
    this.precio = Number(precio);
    this.estado = estado;
    this.descripcion = descripcion;
    this.id_ubicacion = Number(id_ubicacion);
    
    // Inicializamos ubicacion como null, se poblará después si es necesario
    this.ubicacion = null;
  }

  static async find() {
    const [rows] = await pool.execute('SELECT * FROM lotes');
    return rows.map(row => new Lote(row));
  }

 static async findById(id_lote) {
  // Primero obtenemos el lote
  const [loteRows] = await pool.execute(
    'SELECT * FROM lotes WHERE id_lote = ?',
    [id_lote]
  );
  
  if (loteRows.length === 0) {
    throw new Error(`Lote with id ${id_lote} not found`);
  }
  
  const lote = new Lote(loteRows[0]);
  
  // Luego obtenemos la ubicación relacionada
  if (lote.id_ubicacion) {
    const [ubicacionRows] = await pool.execute(
      'SELECT * FROM ubicacion WHERE id = ?',
      [lote.id_ubicacion]
    );
    
    if (ubicacionRows.length > 0) {
      lote.ubicacion = Ubicacion.fromDB(ubicacionRows[0]);
    }
  }
  
  return lote;
}


  async save() {
    const [result] = await pool.execute(
      'INSERT INTO lotes (nombre, area, precio, estado, descripcion) VALUES (?, ?, ?, ?, ?)',
      [this.nombre, this.area, this.precio, this.estado, this.descripcion]
    );
    this.id_lote = result.insertId;
    return this;
  }

  static async marcarComoVendido(id_lote, connection) {
    await connection.execute(
      'UPDATE lotes SET estado = ? WHERE id_lote = ?',
      ['vendido', id_lote]
    );
  }
}
// Buscar lotes por nombre (con paginación)
exports.buscarLotesPorNombre = async (req, res) => {
  const nombre = req.query.nombre || '';
  const pagina = parseInt(req.query.pagina) || 1;
  const limite = parseInt(req.query.limite) || 10;
  const offset = (pagina - 1) * limite;

  try {
    const connection = await db.getConnection();

    // 1. Obtener el total de lotes que coinciden con el nombre
    const [totalRows] = await connection.execute(
      'SELECT COUNT(*) as total FROM lotes WHERE nombre LIKE ?',
      [`%${nombre}%`]
    );
    const total = totalRows[0].total;

    // 2. Obtener los lotes paginados que coinciden con el nombre
    const [lotes] = await connection.execute(
      `SELECT l.id_lote, l.nombre AS codigo, l.precio, l.area AS dimension, l.estado
       FROM lotes l
       WHERE l.nombre LIKE ?
       ORDER BY l.id_lote DESC
       LIMIT ? OFFSET ?`,
      [`%${nombre}%`, limite, offset]
    );

    const totalPaginas = Math.ceil(total / limite);

    res.json({
      lotes,
      total,
      paginaActual: pagina,
      totalPaginas,
      terminoBusqueda: nombre
    });

    connection.release();
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      mensaje: 'Error al buscar lotes por nombre', 
      error: error.message 
    });
  }
};

module.exports = Lote;
