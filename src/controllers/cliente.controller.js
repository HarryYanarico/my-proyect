// cliente.controller.js
const db = require('../config/db');
const Cliente = require('../models/cliente.model');

const handleDatabaseError = (error, res) => {
    console.error('Database error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            message: 'Error: Ya existe un cliente con este CI/NIT o teléfono.',
            code: 'DUPLICATE_ENTRY_ERROR'
        });
    }
    res.status(500).json({
        message: 'Error interno del servidor.',
        error: error.message,
        code: 'SERVER_ERROR'
    });
};

const validateRequiredFields = (fields, res) => {
    const missingFields = Object.entries(fields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missingFields.length > 0) {
        res.status(400).json({
            message: `Error: Faltan campos obligatorios: ${missingFields.join(', ')}.`,
            code: 'VALIDATION_ERROR'
        });
        return false;
    }
    return true;
};

exports.registrarCliente = async (req, res) => {
    // Añadir apellido en la destructuración
    const { ci_nit, nombre, apellido, direccion, telefono, nacionalidad } = req.body;

    // Validar también el apellido si es requerido
    if (!validateRequiredFields({ ci_nit, nombre, apellido, telefono }, res)) return;

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Añadir apellido en la consulta SQL
        const [result] = await connection.execute(
            'INSERT INTO cliente (ci_nit, nombre, apellido, direccion, telefono, nacionalidad) VALUES (?, ?, ?, ?, ?, ?)',
            [ci_nit, nombre, apellido, direccion, telefono, nacionalidad]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(500).json({
                message: 'Error: No se pudo registrar el cliente.',
                code: 'DB_INSERTION_FAILED'
            });
        }

        const [rows] = await connection.execute(
            'SELECT * FROM cliente WHERE id_cliente = ?',
            [result.insertId]
        );

        await connection.commit();
        res.status(201).json({
            message: 'Cliente registrado exitosamente.',
            cliente: new Cliente(rows[0])
        });

    } catch (error) {
        if (connection) await connection.rollback();
        handleDatabaseError(error, res);
    } finally {
        if (connection) connection.release();
    }
};

exports.obtenerClientes = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const [rows] = await connection.execute('SELECT * FROM cliente');

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'No se encontraron clientes.',
                code: 'NO_CLIENTS_FOUND'
            });
        }

        res.status(200).json({
            message: 'Clientes obtenidos exitosamente.',
            clientes: rows.map(row => new Cliente(row))
        });

    } catch (error) {
        handleDatabaseError(error, res);
    } finally {
        if (connection) connection.release();
    }
};

exports.obtenerClientePorId = async (req, res) => {
    const { id_cliente } = req.params;

    if (!validateRequiredFields({ id_cliente }, res)) return;

    let connection;
    try {
        connection = await db.getConnection();
        const cliente = await Cliente.obtenerPorId(id_cliente, connection);

        if (!cliente) {
            return res.status(404).json({
                message: `No se encontró ningún cliente con el ID: ${id_cliente}.`,
                code: 'CLIENT_NOT_FOUND'
            });
        }

        res.status(200).json({
            message: 'Cliente obtenido exitosamente.',
            cliente: cliente
        });

    } catch (error) {
        handleDatabaseError(error, res);
    } finally {
        if (connection) connection.release();
    }
};

exports.actualizar_cliente = async (req, res) => {
    const { id_cliente } = req.params;
    const {
        ci_nit,
        nombre,
        apellido,
        direccion,
        telefono,
        nacionalidad
    } = req.body;

    if (!validateRequiredFields({ id_cliente }, res)) return;

    if (!ci_nit && !nombre && !apellido && !direccion && !telefono && !nacionalidad) {
        return res.status(400).json({
            mensaje: 'Error: Se debe proporcionar al menos un campo para actualizar.',
            codigo: 'SIN_CAMPOS_PARA_ACTUALIZAR'
        });
    }

    let conexion;
    try {
        conexion = await db.getConnection();
        await conexion.beginTransaction();

        const campos_actualizar = [];
        const valores = [];

        if (ci_nit) campos_actualizar.push('ci_nit = ?'), valores.push(ci_nit);
        if (nombre) campos_actualizar.push('nombre = ?'), valores.push(nombre);
        if (apellido) campos_actualizar.push('apellido = ?'), valores.push(apellido);
        if (direccion) campos_actualizar.push('direccion = ?'), valores.push(direccion);
        if (telefono) campos_actualizar.push('telefono = ?'), valores.push(telefono);
        if (nacionalidad) campos_actualizar.push('nacionalidad = ?'), valores.push(nacionalidad);

        valores.push(id_cliente);

        const [resultado] = await conexion.execute(
            `UPDATE cliente SET ${campos_actualizar.join(', ')} WHERE id_cliente = ?`,
            valores
        );

        if (resultado.affectedRows === 0) {
            await conexion.rollback();
            return res.status(404).json({
                mensaje: `Error: No se encontró el cliente con ID: ${id_cliente} o no hubo cambios.`,
                codigo: 'CLIENTE_NO_ENCONTRADO_O_SIN_CAMBIOS'
            });
        }

        const [filas_actualizadas] = await conexion.execute(
            'SELECT * FROM cliente WHERE id_cliente = ?',
            [id_cliente]
        );

        await conexion.commit();
        res.status(200).json({
            mensaje: 'Cliente actualizado correctamente.',
            cliente: new Cliente(filas_actualizadas[0])
        });

    } catch (error) {
        if (conexion) await conexion.rollback();
        manejar_error_bd(error, res);
    } finally {
        if (conexion) conexion.release();
    }
};


exports.eliminarCliente = async (req, res) => {
    const { id_cliente } = req.params;

    if (!validateRequiredFields({ id_cliente }, res)) return;

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.execute(
            'DELETE FROM cliente WHERE id_cliente = ?',
            [id_cliente]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: `Error: No se encontró cliente con ID: ${id_cliente}.`,
                code: 'CLIENT_NOT_FOUND_FOR_DELETION'
            });
        }

        await connection.commit();
        res.status(200).json({
            message: 'Cliente eliminado exitosamente.',
            id_cliente_eliminado: id_cliente
        });

    } catch (error) {
        if (connection) await connection.rollback();
        handleDatabaseError(error, res);
    } finally {
        if (connection) connection.release();
    }
};

exports.buscarClientesPorCI = async (req, res) => {
    const { ci } = req.params;

    if (!validateRequiredFields({ ci }, res)) return;

    let connection;
    try {
        connection = await db.getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM cliente WHERE ci_nit LIKE ?',
            [`%${ci}%`]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: `No se encontraron clientes con el CI/NIT: ${ci}.`,
                code: 'CLIENT_NOT_FOUND_BY_CI'
            });
        }

        res.status(200).json({
            message: 'Clientes encontrados por CI/NIT.',
            clientes: rows.map(row => new Cliente(row))
        });

    } catch (error) {
        handleDatabaseError(error, res);
    } finally {
        if (connection) connection.release();
    }
};

exports.obtenerDetallesCliente = async (req, res) => {
    const { id_cliente } = req.params;

    if (!validateRequiredFields({ id_cliente }, res)) return;

    let connection;
    try {
        connection = await db.getConnection();

        // 1. Obtener detalles del cliente
        const [clienteRows] = await connection.execute(
            'SELECT id_cliente, ci_nit, nombre, apellido, direccion, telefono, nacionalidad FROM cliente WHERE id_cliente = ?',
            [id_cliente]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({
                message: `No se encontró ningún cliente con el ID: ${id_cliente}.`,
                code: 'CLIENT_NOT_FOUND'
            });
        }

        const cliente = clienteRows[0];
        const lotesComprados = [];

        // 2. Obtener ventas asociadas al cliente
        const [ventasRows] = await connection.execute(
            `SELECT
                v.id_venta,
                v.fecha_venta,
                v.tipo_venta,
                l.id_lote,
                l.nombre AS nombre_lote,
                l.area,
                l.precio AS precio_lote_base,
                u.latitud,
                u.longitud,
                u.calle,
                u.avenida,
                u.barrio,
                u.canton,
                vc.monto_total AS precio_contado,
                vc.descuento,
                vc.impuestos,
                vc.metodo_pago,
                vc.comprobante_pago,
                vc.observaciones,
                vcr.plan_financiamiento,
                vcr.cuota_inicial,
                vcr.saldo_pendiente,
                vcr.plazo AS plazo_credito_meses,
                vcr.taza_interes,
                vcr.estado AS estado_credito,
                pp.id_plan_pago,
                pp.fecha_inicial AS plan_fecha_inicial,
                pp.fecha_final AS plan_fecha_final,
                pp.plazo_anio,
                pp.monto_final
            FROM venta v
            JOIN lotes l ON v.id_lote = l.id_lote
            JOIN ubicacion u ON l.id_ubicacion = u.id
            LEFT JOIN venta_contado vc ON v.id_venta = vc.id_venta AND v.tipo_venta = 'contado'
            LEFT JOIN venta_credito vcr ON v.id_venta = vcr.id_venta AND v.tipo_venta = 'credito'
            LEFT JOIN planes_pago pp ON vcr.id_venta_credito = pp.id_venta_credito
            WHERE v.id_cliente = ?
            ORDER BY v.fecha_venta DESC`,
            [id_cliente]
        );

        for (const venta of ventasRows) {
            const loteDetalle = {
                id_venta: venta.id_venta,
                fecha_compra: venta.fecha_venta,
                tipo_venta: venta.tipo_venta,
                lote: {
                    id_lote: venta.id_lote,
                    nombre: venta.nombre_lote,
                    area: venta.area,
                    precio_base: venta.precio_lote_base,
                    ubicacion: {
                        latitud: venta.latitud,
                        longitud: venta.longitud,
                        calle: venta.calle,
                        avenida: venta.avenida,
                        barrio: venta.barrio,
                        canton: venta.canton
                    }
                }
            };

            if (venta.tipo_venta === 'contado') {
                loteDetalle.detalles_contado = {
                    precio_pagado: venta.precio_contado,
                    descuento: venta.descuento,
                    impuestos: venta.impuestos,
                    metodo_pago: venta.metodo_pago,
                    comprobante_pago: venta.comprobante_pago,
                    observaciones: venta.observaciones
                };
            } else if (venta.tipo_venta === 'credito') {
                loteDetalle.detalles_credito = {
                    plan_financiamiento: venta.plan_financiamiento,
                    cuota_inicial: venta.cuota_inicial,
                    saldo_pendiente: venta.saldo_pendiente,
                    plazo_meses: venta.plazo_credito_meses,
                    tasa_interes: venta.taza_interes,
                    estado_credito: venta.estado_credito,
                    plan_pago: {
                        id_plan_pago: venta.id_plan_pago,
                        fecha_inicial: venta.plan_fecha_inicial,
                        fecha_final: venta.plan_fecha_final,
                        plazo_anio: venta.plazo_anio,
                        monto_final: venta.monto_final
                    },
                    cuotas_pagadas: 0,
                    total_cuotas: 0,
                    proxima_cuota: null,
                    fecha_proxima_cuota: null
                };

                // Obtener detalles de las cuotas si es una venta a crédito
                if (venta.id_plan_pago) {
                    const [cuotasRows] = await connection.execute(
                        `SELECT
                            id_cuota,
                            monto_cuota,
                            fecha_venc,
                            estado,
                            fecha_pago,
                            monto_pagado
                        FROM cuotas
                        WHERE id_plan = ?
                        ORDER BY fecha_venc ASC`,
                        [venta.id_plan_pago]
                    );

                    loteDetalle.detalles_credito.total_cuotas = cuotasRows.length;
                    loteDetalle.detalles_credito.cuotas = cuotasRows.map(cuota => ({
                        id_cuota: cuota.id_cuota,
                        monto_cuota: cuota.monto_cuota,
                        fecha_vencimiento: cuota.fecha_venc,
                        estado: cuota.estado,
                        fecha_pago: cuota.fecha_pago,
                        monto_pagado: cuota.monto_pagado
                    }));

                    let cuotasPagadasCount = 0;
                    let proximaCuota = null;
                    let fechaProximaCuota = null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Normalize today's date

                    for (const cuota of cuotasRows) {
                        if (cuota.estado === 'pagado') {
                            cuotasPagadasCount++;
                        } else if (cuota.estado === 'pendiente' && (!proximaCuota || new Date(cuota.fecha_venc) < new Date(fechaProximaCuota))) {
                            // Find the earliest pending cuota
                            proximaCuota = cuota.monto_cuota;
                            fechaProximaCuota = cuota.fecha_venc;
                        }
                    }
                    loteDetalle.detalles_credito.cuotas_pagadas = cuotasPagadasCount;
                    loteDetalle.detalles_credito.proxima_cuota = proximaCuota;
                    loteDetalle.detalles_credito.fecha_proxima_cuota = fechaProximaCuota;
                }
            }
            lotesComprados.push(loteDetalle);
        }

        res.status(200).json({
            message: 'Detalles del cliente obtenidos exitosamente.',
            cliente: {
                ...cliente,
                lotes_comprados: lotesComprados
            }
        });

    } catch (error) {
        handleDatabaseError(error, res);
    } finally {
        if (connection) connection.release();
    }
};
