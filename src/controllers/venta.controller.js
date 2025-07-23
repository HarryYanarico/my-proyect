const db = require('../config/db');
const Venta = require('../models/venta.model');
const VentaContado = require('../models/ventaContado.model');
const VentaCredito = require('../models/ventaCredito.model');
const PlanPago = require('../models/planPago.model');
const Cuota = require('../models/cuota.model');
const Lote = require('../models/lote.model');
const DocumentoVenta = require('../models/documentoVenta.model');
const Cliente = require('../models/cliente.model');
const Empleado = require('../models/usuario.model');

class VentaController {
  /**
   * Crea una nueva venta (al contado o a crédito) con todas sus relaciones
   * @param {Object} req - Request object
   * @param {Object} req.body - Datos de la venta
   * @param {string} req.body.fecha_venta - Fecha de la venta (ISO string)
   * @param {'contado'|'credito'} req.body.tipo_venta - Tipo de venta
   * @param {number} req.body.id_empleado - ID del empleado
   * @param {number} req.body.id_cliente - ID del cliente
   * @param {number} req.body.id_lote - ID del lote
   * @param {Object} [req.body.datos_contado] - Datos para venta al contado
   * @param {Object} [req.body.datos_credito] - Datos para venta a crédito
   * @param {Object} res - Response object
  **/
  static async crearVenta(req, res) {
    let connection;
    try {
      const {
        fecha_venta,
        tipo_venta,
        id_empleado,
        id_cliente,
        id_lote,
        datos_contado,
        datos_credito
      } = req.body;

      // ===== VALIDACIONES INICIALES =====
      if (!fecha_venta || !tipo_venta || !id_empleado || !id_cliente || !id_lote) {
        throw new Error('Faltan campos obligatorios: fecha_venta, tipo_venta, id_empleado, id_cliente, id_lote');
      }

      if (tipo_venta !== 'contado' && tipo_venta !== 'credito') {
        throw new Error('Tipo de venta no válido. Debe ser "contado" o "credito"');
      }

      if (tipo_venta === 'contado' && !datos_contado) {
        throw new Error('Faltan datos de venta al contado');
      }

      if (tipo_venta === 'credito' && !datos_credito) {
        throw new Error('Faltan datos de venta a crédito');
      }

      if (new Date(fecha_venta) > new Date()) {
        throw new Error('La fecha de venta no puede ser futura');
      }

      // ===== OBTENER CONEXIÓN Y COMENZAR TRANSACCIÓN =====
      connection = await db.getConnection();
      await connection.beginTransaction();

      // ===== VERIFICAR ENTIDADES RELACIONADAS =====
      const [empleado, cliente, lote] = await Promise.all([
        Empleado.obtenerPorId(id_empleado, connection),
        Cliente.obtenerPorId(id_cliente, connection),
        Lote.findById(id_lote)
      ]);

      if (!empleado) throw new Error('Empleado no encontrado');
      if (!cliente) throw new Error('Cliente no encontrado');
      if (!lote) throw new Error('Lote no encontrado');
      if (lote.estado !== 'disponible') throw new Error('Lote no disponible para venta');

      // ===== CREAR VENTA PRINCIPAL =====
      const venta = new Venta({
        fecha_venta,
        tipo_venta
      });
      venta.setCliente(cliente);
      venta.setLote(lote);
      venta.setEmpleado(empleado);

      const ventaId = await venta.guardar(connection);

      // ===== PROCESAR VENTA AL CONTADO =====
      if (tipo_venta === 'contado') {
        const { 
          metodo_pago, 
          descuento = 0, 
          monto_total, 
          comprobante_pago, 
          
          impuestos = 0, 
          observaciones = '', 
          documento 
        } = datos_contado;

        if (monto_total <= 0) {
          throw new Error('El monto total debe ser mayor a cero');
        }

        // Crear documento
        const docVenta = new DocumentoVenta({
          tipo_documento: documento.tipo_documento,
          fecha_emision: documento.fecha_emision,
          archivo_ruta: documento.archivo_ruta,
          estado: documento.estado || 'emitido'
        });
        const docId = await docVenta.guardar(connection);
        venta.setDocumentoVenta(docVenta);

        // Crear venta contado
        const ventaContado = new VentaContado({
          id_venta: ventaId,
          metodo_pago,
          descuento,
          monto_total,
          comprobante_pago,
          impuestos,
          observaciones,
          id_documento: docId
        });
        await ventaContado.guardar(connection);
        venta.setVentaContado(ventaContado);
      }

      // ===== PROCESAR VENTA A CRÉDITO =====
      if (tipo_venta === 'credito') {
        const { 
          plan_financiamiento, 
          cuota_inicial, 
          saldo_pendiente, 
          plazo, 
          taza_interes, 
          estado = 'pendiente', 
          plan 
        } = datos_credito;

        if (cuota_inicial < 0 || saldo_pendiente < 0 || plazo < 0 || taza_interes < 0) {
          throw new Error('Datos financieros inválidos');
        }

        // Crear venta crédito
        const ventaCredito = new VentaCredito({
          id_venta: ventaId,
          plan_financiamiento,
          cuota_inicial,
          saldo_pendiente,
          plazo,
          taza_interes,
          estado
        });
        const creditoId = await ventaCredito.guardar(connection);
        venta.setVentaCredito(ventaCredito);

        // Crear plan de pago
        const planPago = new PlanPago({
          id_venta_credito: creditoId,
          cuota_inicial: plan.cuota_inicial,
          fecha_inicial: plan.fecha_inicial,
          fecha_final: plan.fecha_final,
          plazo_anio: plan.plazo_anio,
          monto_final: plan.monto_final
        });
        const planId = await planPago.guardar(connection);

        // Validar y crear cuotas
        if (!plan.cuotas || !Array.isArray(plan.cuotas)) {
          throw new Error('El plan de pago debe incluir un array de cuotas');
        }

        for (const cuotaData of plan.cuotas) {
          if (!cuotaData.monto_cuota || !cuotaData.fecha_venc) {
            throw new Error('Cada cuota debe tener monto_cuota y fecha_venc');
          }

          const cuota = new Cuota({
            id_plan: planId,
            monto_cuota: cuotaData.monto_cuota,
            fecha_venc: cuotaData.fecha_venc,
            estado: 'pendiente'
          });
          await cuota.guardar(connection);
        }
      }

      // ===== ACTUALIZAR ESTADO DEL LOTE =====
      await Lote.marcarComoVendido(id_lote, connection);

      // ===== CONFIRMAR TRANSACCIÓN =====
      await connection.commit();

      res.status(201).json({ 
        success: true,
        mensaje: 'Venta registrada con éxito', 
        venta_id: ventaId,
        venta: venta.toJSON() // Asumiendo que tienes un método toJSON en tu modelo
      });

    } catch (error) {
      // ===== MANEJO DE ERRORES =====
      if (connection) {
        await connection.rollback();
      }

      console.error('Error en crearVenta:', error);

      const statusCode = 
        error.message.includes('no encontrado') ? 404 :
        error.message.includes('Faltan campos') || 
        error.message.includes('no válido') || 
        error.message.includes('inválido') ? 400 : 500;

      res.status(statusCode).json({ 
        success: false,
        mensaje: 'Error al registrar la venta', 
        error: error.message 
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
  
  static async listarVentas(req, res) {
    let connection;
    try {
      connection = await db.getConnection();

      // Obtener parámetros de paginación
      const { pagina = 1, porPagina = 10 } = req.query;
      const offset = (pagina - 1) * porPagina;

      // Obtener ventas base
      const [ventasRows] = await connection.execute(
        `SELECT * FROM venta ORDER BY fecha_venta DESC LIMIT ? OFFSET ?`,
        [Number(porPagina), Number(offset)]
      );

      if (!ventasRows.length) {
        return res.status(200).json({
          success: true,
          data: [],
          paginacion: {
            pagina: Number(pagina),
            porPagina: Number(porPagina),
            total: 0
          }
        });
      }

      // Procesar cada venta para obtener sus relaciones
      const ventasCompletas = await Promise.all(
        ventasRows.map(async (ventaRow) => {
          const venta = Venta.fromDB(ventaRow);

          // Obtener relaciones básicas
          const [cliente, empleado, lote] = await Promise.all([
            Cliente.obtenerPorId(ventaRow.id_cliente, connection),
            Empleado.obtenerPorId(ventaRow.id_empleado, connection),
            Lote.findById(ventaRow.id_lote)
          ]);

          venta.setCliente(cliente);
          venta.setEmpleado(empleado);
          venta.setLote(lote);

          // Obtener detalles específicos según tipo de venta
          if (ventaRow.tipo_venta === 'contado') {
            const ventaContado = await VentaContado.obtenerPorVentaId(ventaRow.id_venta, connection);
            venta.setVentaContado(ventaContado);

            if (ventaContado && ventaContado.id_documento) {
              const documento = await DocumentoVenta.obtenerPorId(ventaContado.id_documento, connection);
              venta.setDocumentoVenta(documento);
            }
          } else if (ventaRow.tipo_venta === 'credito') {
            const ventaCredito = await VentaCredito.obtenerPorVentaId(ventaRow.id_venta, connection);
            venta.setVentaCredito(ventaCredito);

            if (ventaCredito && ventaCredito.id_plan_pago) {
              const planPago = await PlanPago.obtenerPorId(ventaCredito.id_plan_pago, connection);
              if (planPago) {
                const cuotas = await Cuota.obtenerPorPlanId(planPago.id_plan_pago, connection);
                planPago.cuotas = cuotas;
              }
            }
          }

          return venta.toJSON();
        })
      );

      // Obtener conteo total para paginación
      const [totalRows] = await connection.execute('SELECT COUNT(*) as total FROM venta');
      const totalVentas = totalRows[0].total;

      res.status(200).json({
        success: true,
        data: ventasCompletas,
        paginacion: {
          pagina: Number(pagina),
          porPagina: Number(porPagina),
          total: Number(totalVentas)
        }
      });

    } catch (error) {
      console.error('Error al listar ventas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las ventas',
        error: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  }

  static async obtenerVentaPorId(req, res) {
    let connection;
    try {
      const { id } = req.params;
      connection = await db.getConnection();
      // Buscar la venta base
      const ventaRow = await connection.execute('SELECT * FROM venta WHERE id_venta = ?', [id]);
      const rows = ventaRow[0];
      if (!rows.length) {
        return res.status(404).json({
          success: false,
          mensaje: 'Venta no encontrada'
        });
      }
      const ventaData = rows[0];
      // Validar que los IDs de relaciones existan
      if (!ventaData.id_cliente || !ventaData.id_empleado || !ventaData.id_lote) {
        return res.status(400).json({
          success: false,
          mensaje: 'La venta no tiene relaciones completas (cliente, empleado o lote)'
        });
      }
      const venta = Venta.fromDB(ventaData);
      // Obtener relaciones básicas usando los IDs de la fila
      const [cliente, empleado, lote] = await Promise.all([
        Cliente.obtenerPorId(ventaData.id_cliente, connection),
        Empleado.obtenerPorId(ventaData.id_empleado, connection),
        Lote.findById(ventaData.id_lote)
      ]);
      venta.setCliente(cliente);
      venta.setEmpleado(empleado);
      venta.setLote(lote);
      // Obtener detalles específicos según tipo de venta
      if (venta.tipo_venta === 'contado') {
        const ventaContado = await VentaContado.obtenerPorVentaId(venta.id_venta, connection);
        venta.setVentaContado(ventaContado);
        if (ventaContado && ventaContado.id_documento) {
          const documento = await DocumentoVenta.obtenerPorId(ventaContado.id_documento, connection);
          venta.setDocumentoVenta(documento);
        }
      } else if (venta.tipo_venta === 'credito') {
        const ventaCredito = await VentaCredito.obtenerPorVentaId(venta.id_venta, connection);
        venta.setVentaCredito(ventaCredito);
        if (ventaCredito && ventaCredito.id_plan_pago) {
          const planPago = await PlanPago.obtenerPorId(ventaCredito.id_plan_pago, connection);
          if (planPago) {
            const cuotas = await Cuota.obtenerPorPlanId(planPago.id_plan_pago, connection);
            planPago.cuotas = cuotas;
            ventaCredito.planPago = planPago;
          }
        }
      }
      res.status(200).json({
        success: true,
        data: venta.toJSON()
      });
    } catch (error) {
      console.error('Error al obtener venta por id:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al obtener la venta',
        error: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  }

  static async registrarPagos(req, res){
    let conexion;
      try{

      }
      catch(error){}
      
  }
  
}
module.exports = VentaController;