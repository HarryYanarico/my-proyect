// src/controllers/pago.controller.js
const PagoCuota = require('../models/pagoCuota.model');
const pool = require('../config/db');

class PagoController {
  static async registrarPago(req, res) {
    let conexion;
    try {
      // Validación de datos
      const { id_cuota, id_empleado, monto, fecha_pago, metodo_pago, comprobante } = req.body;
      
      if (!id_cuota || !id_empleado || !monto || !fecha_pago) {
        return res.status(400).json({ 
          success: false, 
          message: 'Faltan campos requeridos' 
        });
      }

      conexion = await pool.getConnection();
      await conexion.beginTransaction();

      // 1. Verificar que la cuota existe y está pendiente
      const [cuota] = await conexion.execute(
        'SELECT * FROM cuotas WHERE id_cuota = ? FOR UPDATE',
        [id_cuota]
      );
      
      if (cuota.length === 0) {
        await conexion.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'Cuota no encontrada' 
        });
      }

      // 2. Verificar que el empleado existe
      const [empleado] = await conexion.execute(
        'SELECT id FROM empleados WHERE id = ?',
        [id_empleado]
      );
      
      if (empleado.length === 0) {
        await conexion.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'Empleado no encontrado' 
        });
      }

      // 3. Validar monto
      const saldoPendiente = cuota[0].monto_cuota - cuota[0].monto_pagado;
      if (monto <= 0 || monto > saldoPendiente) {
        await conexion.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `Monto inválido. Saldo pendiente: ${saldoPendiente}`
        });
      }

      // 4. Registrar el pago (INSERT)
      const nuevoPago = new PagoCuota({
        id_cuota,
        id_empleado,
        monto,
        fecha_pago,
        metodo_pago,
        comprobante
      });

      const idPago = await nuevoPago.guardar(conexion);

      // 5. Actualizar la cuota (UPDATE)
      const nuevoMontoPagado = parseFloat(cuota[0].monto_pagado) + parseFloat(monto);
      const nuevoEstado = nuevoMontoPagado >= cuota[0].monto_cuota ? 'pagado' : 'parcial';

      await conexion.execute(
        `UPDATE cuotas SET 
          monto_pagado = ?, 
          estado = ?, 
          fecha_pago = ? 
        WHERE id_cuota = ?`,
        [nuevoMontoPagado, nuevoEstado, fecha_pago, id_cuota]
      );
      await conexion.commit();

      res.status(201).json({
        success: true,
        message: 'Pago registrado exitosamente',
        data: {
          id_pago: idPago,
          id_cuota,
          monto,
          saldo_anterior: cuota[0].monto_pagado,
          nuevo_saldo: nuevoMontoPagado,
          estado: nuevoEstado
        }
      });

    } catch (error) {
      console.error('Error en registrarPago:', error);
      if (conexion) await conexion.rollback();
      res.status(500).json({ 
        success: false, 
        message: 'Error al registrar el pago',
        error: error.message 
      });
    } finally {
      if (conexion) conexion.release();
    }
  }
 // Obtener pago específico
  static async obtenerPago(req, res) {
    let conexion;
    try {
      const { id } = req.params;
      conexion = await pool.getConnection();
      
      const pago = await PagoCuota.obtenerPorId(id, conexion);
      
      if (!pago) {
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      res.json({
        success: true,
        data: pago.toJSON()
      });

    } catch (error) {
      console.error('Error en obtenerPago:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el pago',
        error: error.message
      });
    } finally {
      if (conexion) conexion.release();
    }
  }

  // Listar pagos por cuota
  static async listarPagosPorCuota(req, res) {
    let conexion;
    try {
      const { id_cuota } = req.params;
      conexion = await pool.getConnection();
      
      const [pagos] = await conexion.execute(
        `SELECT pc.*, e.nombre as empleado_nombre 
         FROM pago_cuota pc
         JOIN empleados e ON pc.id_empleado = e.id
         WHERE pc.id_cuota = ?
         ORDER BY pc.fecha_pago DESC`,
        [id_cuota]
      );

      res.json({
        success: true,
        data: pagos
      });

    } catch (error) {
      console.error('Error en listarPagosPorCuota:', error);
      res.status(500).json({
        success: false,
        message: 'Error al listar pagos',
        error: error.message
      });
    } finally {
      if (conexion) conexion.release();
    }
  }

  // Listar pagos por venta
  static async listarPagosPorVenta(req, res) {
    let conexion;
    try {
      const { id_venta } = req.params;
      conexion = await pool.getConnection();
      
      const pagos = await PagoCuota.obtenerPorVenta(id_venta, conexion);

      res.json({
        success: true,
        data: pagos.map(p => p.toJSON())
      });

    } catch (error) {
      console.error('Error en listarPagosPorVenta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al listar pagos',
        error: error.message
      });
    } finally {
      if (conexion) conexion.release();
    }
  }

  // Eliminar pago (con validación)
  static async eliminarPago(req, res) {
    let conexion;
    try {
      const { id } = req.params;
      conexion = await pool.getConnection();
      await conexion.beginTransaction();

      // 1. Obtener el pago para validar
      const pago = await PagoCuota.obtenerPorId(id, conexion);
      
      if (!pago) {
        await conexion.rollback();
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // 2. Obtener la cuota asociada
      const [cuota] = await conexion.execute(
        'SELECT * FROM cuotas WHERE id_cuota = ? FOR UPDATE',
        [pago.id_cuota]
      );

      if (cuota.length === 0) {
        await conexion.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cuota asociada no encontrada'
        });
      }

      // 3. Revertir el pago en la cuota
      const nuevoMonto = parseFloat(cuota[0].monto_pagado) - parseFloat(pago.monto);
      const nuevoEstado = nuevoMonto <= 0 ? 'pendiente' : 
                         (nuevoMonto >= cuota[0].monto_cuota ? 'pagado' : 'parcial');

      await conexion.execute(
        `UPDATE cuotas SET 
          monto_pagado = ?, 
          estado = ?,
          fecha_pago = CASE WHEN ? = 0 THEN NULL ELSE fecha_pago END
         WHERE id_cuota = ?`,
        [nuevoMonto, nuevoEstado, nuevoMonto, pago.id_cuota]
      );

      // 4. Revertir en venta_credito si estaba pagado
      if (cuota[0].estado === 'pagado') {
        await conexion.execute(
          `UPDATE venta_credito vc
           JOIN planes_pago pp ON pp.id_venta_credito = vc.id_venta_credito
           SET vc.saldo_pendiente = vc.saldo_pendiente + ?
           WHERE pp.id_plan_pago = ?`,
          [pago.monto, cuota[0].id_plan]
        );
      }

      // 5. Eliminar el registro de pago
      await PagoCuota.eliminar(id, conexion);

      await conexion.commit();

      res.json({
        success: true,
        message: 'Pago eliminado correctamente',
        data: {
          id_pago: id,
          id_cuota: pago.id_cuota,
          monto_revertido: pago.monto
        }
      });

    } catch (error) {
      console.error('Error en eliminarPago:', error);
      if (conexion) await conexion.rollback();
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el pago',
        error: error.message
      });
    } finally {
      if (conexion) conexion.release();
    }
  }

  // Actualizar pago (solo datos no críticos)
  static async actualizarPago(req, res) {
    let conexion;
    try {
      const { id } = req.params;
      const { metodo_pago, comprobante } = req.body;
      
      if (!metodo_pago && !comprobante) {
        return res.status(400).json({
          success: false,
          message: 'Nada que actualizar'
        });
      }

      conexion = await pool.getConnection();
      
      await conexion.execute(
        `UPDATE pago_cuota SET
          metodo_pago = COALESCE(?, metodo_pago),
          comprobante = COALESCE(?, comprobante)
         WHERE id_pago = ?`,
        [metodo_pago, comprobante, id]
      );

      const pagoActualizado = await PagoCuota.obtenerPorId(id, conexion);

      res.json({
        success: true,
        message: 'Pago actualizado',
        data: pagoActualizado.toJSON()
      });

    } catch (error) {
      console.error('Error en actualizarPago:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el pago',
        error: error.message
      });
    } finally {
      if (conexion) conexion.release();
    }
  }


  static async listarCuotasPendientesPorLote(req, res) { // <-- NUEVO MÉTODO
    let conexion;
    try {
      const { id_lote } = req.params; // O req.query si prefieres un query parameter
      
      if (!id_lote) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere el ID del lote' 
        });
      }

      conexion = await pool.getConnection();

      // Consulta SQL para obtener cuotas pendientes de un lote específico
      // Necesitas JOINs para conectar cuotas -> planes_pago -> venta_credito -> lote
      const [cuotas] = await conexion.execute(
            `SELECT 
                c.id_cuota,
                c.monto_cuota,
                c.fecha_venc,
                c.estado,
                c.monto_pagado,
                l.nombre AS nombre_lote,
                vc.id_venta_credito
            FROM cuotas c
            JOIN planes_pago pp ON c.id_plan = pp.id_plan_pago
            JOIN venta_credito vc ON pp.id_venta_credito = vc.id_venta_credito
            JOIN venta v ON vc.id_venta = v.id_venta
            JOIN lotes l ON v.id_lote = l.id_lote
            WHERE l.id_lote = ? AND c.estado IN ('pendiente', 'parcial','pagado')
            ORDER BY c.fecha_venc ASC`,
            [id_lote]
        );

      res.json({
        success: true,
        data: cuotas
      });

    } catch (error) {
      console.error('Error en listarCuotasPendientesPorLote:', error);
      res.status(500).json({
        success: false,
        message: 'Error al listar cuotas pendientes por lote',
        error: error.message
      });
    } finally {
      if (conexion) conexion.release();
    }
  }
  // Dentro de la clase PagoController { ... }

  static async listarUltimosPagos(req, res) {
    let conexion;
    try {
      // Puedes especificar un límite de resultados, por defecto 10
      const { limit = 10 } = req.query; 

      conexion = await pool.getConnection();

      const [pagos] = await conexion.execute(
        `SELECT 
            pc.id_pago,
            pc.id_cuota,
            pc.id_empleado,
            pc.monto,
            pc.fecha_pago,
            pc.metodo_pago,
            pc.comprobante,
            e.nombre AS empleado_nombre, 
            c.monto_cuota,
            c.fecha_venc,
            c.estado AS estado_cuota,
            v.id_venta,
            l.nombre AS nombre_lote,
            CONCAT(cli.nombre, ' ', cli.apellido) AS nombre_cliente -- Usando 'nombre' y 'apellido' de la tabla 'cliente'
         FROM pago_cuota pc
         JOIN empleados e ON pc.id_empleado = e.id
         JOIN cuotas c ON pc.id_cuota = c.id_cuota
         JOIN planes_pago pp ON c.id_plan = pp.id_plan_pago
         JOIN venta_credito vc ON pp.id_venta_credito = vc.id_venta_credito
         JOIN venta v ON vc.id_venta = v.id_venta
         JOIN lotes l ON v.id_lote = l.id_lote
         JOIN cliente cli ON v.id_cliente = cli.id_cliente -- Alias 'cli' para la tabla 'cliente'
         ORDER BY pc.fecha_pago DESC, pc.id_pago DESC
         LIMIT ?`,
        [parseInt(limit)]
      );

      res.json({
        success: true,
        data: pagos
      });

    } catch (error) {
      console.error('Error en listarUltimosPagos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al listar los últimos pagos',
        error: error.message
      });
    } finally {
      if (conexion) conexion.release();
    }
  }
}

module.exports = PagoController;   