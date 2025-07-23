// src/models/pagoCuota.model.js
class PagoCuota {
  constructor({
    id_pago,
    id_cuota,
    id_empleado,
    monto,
    fecha_pago,
    metodo_pago = 'efectivo', // Puedes agregar más opciones
    comprobante = null
  }) {
    this.id_pago = id_pago ? Number(id_pago) : null;
    this.id_cuota = Number(id_cuota);
    this.id_empleado = Number(id_empleado);
    this.monto = Number(monto);
    this.fecha_pago = new Date(fecha_pago);
    this.metodo_pago = metodo_pago;
    this.comprobante = comprobante;
  }

  async guardar(connection) {
    const [result] = await connection.execute(
      `INSERT INTO pago_cuota (
        id_cuota, id_empleado, monto, fecha_pago, metodo_pago, comprobante
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        this.id_cuota, this.id_empleado, this.monto,
        this.fecha_pago, this.metodo_pago, this.comprobante
      ]
    );
    this.id_pago = result.insertId;
    return result.insertId;
  }

  static async obtenerPorCuota(id_cuota, connection) {
    const [rows] = await connection.execute(
      'SELECT * FROM pago_cuota WHERE id_cuota = ? ORDER BY fecha_pago',
      [id_cuota]
    );
    return rows.map(row => new PagoCuota(row));
  }

  toJSON() {
    return {
      id_pago: this.id_pago,
      id_cuota: this.id_cuota,
      id_empleado: this.id_empleado,
      monto: this.monto,
      fecha_pago: this.fecha_pago.toISOString().split('T')[0],
      metodo_pago: this.metodo_pago,
      comprobante: this.comprobante
    };
  }
}

module.exports = PagoCuota;