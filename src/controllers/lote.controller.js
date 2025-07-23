
const Lote = require('../models/lote.model');
const Ubicacion = require('../models/ubicacion.model');
const Cliente = require('../models/cliente.model');

const pool = require('../config/db');

const db = require('../config/db');

// Crear un nuevo lote con ubicación
exports.crearLote = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Guardar ubicación
    const ubicacionData = req.body.ubicacion;
    const ubicacion = new Ubicacion(ubicacionData);
    await ubicacion.validate();
    const [ubicacionResult] = await connection.execute(
      `INSERT INTO ubicacion (latitud, longitud, calle, avenida, barrio, canton)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ubicacion.latitud,
        ubicacion.longitud,
        ubicacion.calle,
        ubicacion.avenida,
        ubicacion.barrio,
        ubicacion.canton
      ]
    );
    const id_ubicacion = ubicacionResult.insertId;

    // 2. Guardar lote con id_ubicacion
    const { nombre, area, precio, estado = 'disponible', descripcion = '' } = req.body;
    const [loteResult] = await connection.execute(
      `INSERT INTO lotes (nombre, area, precio, estado, descripcion, id_ubicacion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, area, precio, estado, descripcion, id_ubicacion]
    );

    await connection.commit();

    res.status(201).json({
      mensaje: 'Lote creado correctamente',
      lote: {
        id_lote: loteResult.insertId,
        nombre,
        area,
        precio,
        estado,
        descripcion,
        id_ubicacion
      },
      ubicacion
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear el lote con ubicación', error });
  } finally {
    connection.release();
  }
};


// Listar todos los lotes
// Listar lotes con paginación
exports.listarLotes = async (req, res) => {
  const pagina = parseInt(req.query.pagina) || 1;
  const limite = parseInt(req.query.limite) || 10;
  const offset = (pagina - 1) * limite;

  try {
    const connection = await db.getConnection();

    // 1. Obtener el total de lotes
    const [totalRows] = await connection.execute('SELECT COUNT(*) as total FROM lotes');
    const total = totalRows[0].total;

    // 2. Obtener los lotes paginados con sus datos básicos
    const [lotes] = await connection.execute(`
      SELECT l.id_lote, l.nombre AS codigo, l.precio, l.area AS dimension, l.estado
      FROM lotes l
      ORDER BY l.id_lote DESC
      LIMIT ? OFFSET ?
    `, [limite, offset]);

    const totalPaginas = Math.ceil(total / limite);

    res.json({
      lotes,
      total,
      paginaActual: pagina,
      totalPaginas
    });

    connection.release();
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al listar los lotes paginados', error });
  }
};

// Buscar un lote por ID
exports.buscarLote = async (req, res) => {
  try {
    const lote = await Lote.findById(req.params.id);
    if (!lote) {
      return res.status(404).json({ mensaje: 'Lote no encontrado' });
    }
    // La respuesta incluirá automáticamente la ubicación
    res.json({
      ...lote,
      ubicacion: lote.ubicacion // Esto será un objeto Ubicacion completo
    });
  } catch (error) {
    console.error("Error al buscar el lote:", error); 
    res.status(500).json({ mensaje: 'Error al buscar el lote', error: error.message });
  }
};

exports.modificarLote = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const id_lote = req.params.id;
    // Obtener datos del lote y ubicación
    const { nombre, area, precio, estado, descripcion, ubicacion } = req.body;

    // 1. Actualizar lote
    const [loteRows] = await connection.execute(
      'SELECT id_ubicacion FROM lotes WHERE id_lote = ?',
      [id_lote]
    );
    if (loteRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ mensaje: 'Lote no encontrado' });
    }
    const id_ubicacion = loteRows[0].id_ubicacion;

    await connection.execute(
      `UPDATE lotes SET nombre = ?, area = ?, precio = ?, estado = ?, descripcion = ? WHERE id_lote = ?`,
      [nombre, area, precio, estado, descripcion, id_lote]
    );

    // 2. Actualizar ubicación si se proporciona
    if (ubicacion) {
      await connection.execute(
        `UPDATE ubicacion SET latitud = ?, longitud = ?, calle = ?, avenida = ?, barrio = ?, canton = ? WHERE id = ?`,
        [
          ubicacion.latitud,
          ubicacion.longitud,
          ubicacion.calle,
          ubicacion.avenida,
          ubicacion.barrio,
          ubicacion.canton,
          id_ubicacion
        ]
      );
    }

    await connection.commit();

    res.json({ mensaje: 'Lote modificado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ mensaje: 'Error al modificar el lote', error });
  } finally {
    connection.release();
  }
};

// Buscar lotes por nombre (con paginación)
exports.buscarLotesPorNombre = async (req, res) => {
  const nombre = req.query.nombre || '';
  const pagina = parseInt(req.query.pagina) || 1;
  const limite = parseInt(req.query.limite) || 10;
  const offset = (pagina - 1) * limite;

  try {
    const connection = await db.getConnection();

    // 1. Obtener el total de lotes que coinciden con el nombre
    // Esta consulta no necesita cambios, solo cuenta.
    const [totalRows] = await connection.execute(
      'SELECT COUNT(*) as total FROM lotes WHERE nombre LIKE ?',
      [`%${nombre}%`]
    );
    const total = totalRows[0].total;

    // 2. Obtener los lotes paginados que coinciden con el nombre
    //    Ahora incluye descripción y datos de ubicación mediante un JOIN.
    const [lotes] = await connection.execute(
  `SELECT l.id_lote, l.nombre AS codigo, l.precio, l.area AS dimension, l.estado,
          l.descripcion, u.latitud, u.longitud, u.calle, u.avenida
   FROM lotes l
   JOIN ubicacion u ON l.id_ubicacion = u.id
   WHERE l.nombre LIKE ?
   ORDER BY l.id_lote DESC
   LIMIT ? OFFSET ?`,
  [`%${nombre}%`, limite, offset]
);

    const totalPaginas = Math.ceil(total / limite);

    const lotesTransformados = lotes.map(lote => ({
  ...lote,
  ubicacion: {
    latitud: lote.latitud,
    longitud: lote.longitud,
    calle: lote.calle,
    avenida: lote.avenida
  }
}));
res.json({
  lotes: lotesTransformados,
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




exports.listarLotesConCredito = async (req, res) => {
    let conexion;
    try {
        // 1. Cambiado de id_cliente a ci_nit, ya que es lo que se recibe por parámetro.
        const { ci_nit } = req.params;
        console.log('Valor de ci_nit recibido en req.params:', ci_nit); // <-- ¡Aquí!
        conexion = await pool.getConnection(); // Asegúrate de que 'db.pool' es tu conexión al pool de la base de datos.

        // 2. Usar Cliente.obtenerIdPorCiNit para conseguir el id_cliente a partir del ci_nit.
        const idClienteEncontrado = await Cliente.obtenerIdPorCiNit(ci_nit, conexion); // Esta función devuelve directamente el id_cliente o null.

        // 3. Verificar que el cliente existe con ese ci_nit.
        if (!idClienteEncontrado) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado con el CI/NIT proporcionado.'
            });
        }

        // 4. Obtener los lotes asociados al cliente con estado 'credito'
        // Se usa idClienteEncontrado en la consulta SQL.
        const [lotes] = await conexion.execute(`
            SELECT
                l.id_lote,
                l.nombre AS codigo,
                l.area,
                l.precio,
                l.estado,
                l.descripcion,
                u.latitud,
                u.longitud,
                u.calle,
                u.avenida,
                u.barrio,
                u.canton,
                c.id_cliente,
                c.ci_nit,
                CONCAT(c.nombre, ' ', c.apellido) AS nombre_cliente
            FROM lotes l
            LEFT JOIN ubicacion u ON l.id_ubicacion = u.id
            JOIN venta v ON l.id_lote = v.id_lote
            JOIN cliente c ON v.id_cliente = c.id_cliente
            WHERE c.id_cliente = ?
              AND v.tipo_venta = 'credito'
            ORDER BY l.id_lote
        `, [idClienteEncontrado]); // Se pasa el id_cliente obtenido para la consulta.

        // 5. Formatear la respuesta según la estructura solicitada
        const resultado = lotes.map(lote => ({
            id_lote: lote.id_lote,
            codigo: lote.codigo,
            precio: lote.precio,
            estado: lote.estado,
            descripcion: lote.descripcion,
            ubicacion: {
                latitud: lote.latitud,
                longitud: lote.longitud,
                calle: lote.calle,
                avenida: lote.avenida,
                barrio: lote.barrio,
                canton: lote.canton
            },
            id_cliente: lote.id_cliente,
            ci_nit: lote.ci_nit,
            nombre_cliente: lote.nombre_cliente
        }));

        res.json({
            success: true,
            data: resultado
        });

    } catch (error) {
        console.error('Error en listarLotesConCredito:', error);
        res.status(500).json({
            success: false,
            message: 'Error al listar lotes del cliente',
            error: error.message
        });
    } finally {
        if (conexion) conexion.release();
    }
};