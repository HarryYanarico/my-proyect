//ventaCredito.js
class VentaCredito {
  constructor({
    id_venta_credito,
    id_venta,
    plan_financiamiento,
    cuota_inicial,
    saldo_pendiente,
    plazo,
    taza_interes,
    estado = 'pendiente',
    id_plan_pago = null
  }) {
    this.id_venta_credito = id_venta_credito ? Number(id_venta_credito) : null;
    this.id_venta = Number(id_venta);
    this.plan_financiamiento = plan_financiamiento;
    this.cuota_inicial = Number(cuota_inicial);
    this.saldo_pendiente = Number(saldo_pendiente);
    this.plazo = Number(plazo);
    this.taza_interes = Number(taza_interes);
    this.estado = estado;
    this.id_plan_pago = id_plan_pago ? Number(id_plan_pago) : null;
  }

  async guardar(connection) {
    const [result] = await connection.execute(
      `INSERT INTO venta_credito (
        id_venta, plan_financiamiento, cuota_inicial, saldo_pendiente,
        plazo, taza_interes, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        this.id_venta, this.plan_financiamiento, this.cuota_inicial,
        this.saldo_pendiente, this.plazo, this.taza_interes, this.estado
      ]
    );
    this.id_venta_credito = result.insertId;
    return result.insertId;
  }

  async actualizar(connection) {
    if (!this.id_venta_credito) throw new Error('ID de venta crédito no definido');
    
    await connection.execute(
      `UPDATE venta_credito SET 
        plan_financiamiento = ?, cuota_inicial = ?, saldo_pendiente = ?,
        plazo = ?, taza_interes = ?, estado = ?, id_plan_pago = ?
      WHERE id_venta_credito = ?`,
      [
        this.plan_financiamiento, this.cuota_inicial, this.saldo_pendiente,
        this.plazo, this.taza_interes, this.estado, this.id_plan_pago,
        this.id_venta_credito
      ]
    );
    return this;
  }

  static async obtenerPorVentaId(id_venta, connection) {
    const [rows] = await connection.execute(
      'SELECT * FROM venta_credito WHERE id_venta = ?',
      [id_venta]
    );
    return rows.length ? new VentaCredito(rows[0]) : null;
  }

  toJSON() {
    return {
      id_venta_credito: this.id_venta_credito,
      id_venta: this.id_venta,
      plan_financiamiento: this.plan_financiamiento,
      cuota_inicial: this.cuota_inicial,
      saldo_pendiente: this.saldo_pendiente,
      plazo: this.plazo,
      taza_interes: this.taza_interes,
      estado: this.estado,
      id_plan_pago: this.id_plan_pago
    };
  }
}

module.exports = VentaCredito;