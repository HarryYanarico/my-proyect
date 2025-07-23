//planPago.model.js
class PlanPago {
  constructor({
    id_plan_pago,
    id_venta_credito,
    cuota_inicial,
    fecha_inicial,
    fecha_final,
    plazo_anio,
    monto_final
  }) {
    this.id_plan_pago = id_plan_pago ? Number(id_plan_pago) : null;
    this.id_venta_credito = id_venta_credito ? Number(id_venta_credito) : null;
    this.cuota_inicial = Number(cuota_inicial);
    this.fecha_inicial = new Date(fecha_inicial);
    this.fecha_final = new Date(fecha_final);
    this.plazo_anio = Number(plazo_anio);
    this.monto_final = Number(monto_final);
  }

  async guardar(connection) {
    const [result] = await connection.execute(
      `INSERT INTO planes_pago (
        id_venta_credito, cuota_inicial, fecha_inicial,
        fecha_final, plazo_anio, monto_final
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        this.id_venta_credito, this.cuota_inicial, this.fecha_inicial,
        this.fecha_final, this.plazo_anio, this.monto_final
      ]
    );
    this.id_plan_pago = result.insertId;
    return result.insertId;
  }

  static async obtenerPorId(id_plan_pago, connection) {
    const [rows] = await connection.execute(
      'SELECT * FROM planes_pago WHERE id_plan_pago = ?',
      [id_plan_pago]
    );
    return rows.length ? new PlanPago(rows[0]) : null;
  }

  toJSON() {
    return {
      id_plan_pago: this.id_plan_pago,
      id_venta_credito: this.id_venta_credito,
      cuota_inicial: this.cuota_inicial,
      fecha_inicial: this.fecha_inicial.toISOString().split('T')[0],
      fecha_final: this.fecha_final.toISOString().split('T')[0],
      plazo_anio: this.plazo_anio,
      monto_final: this.monto_final
    };
  }
}

module.exports = PlanPago;