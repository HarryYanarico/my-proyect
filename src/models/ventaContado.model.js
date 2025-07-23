class VentaContado {
  constructor({
    id_venta_contado,
    id_venta,
    metodo_pago,
    descuento = 0,
    monto_total,
    comprobante_pago,
    impuestos = 0,
    observaciones = '',
    id_documento
  }) {
    this.id_venta_contado = id_venta_contado ? Number(id_venta_contado) : null;
    this.id_venta = Number(id_venta);
    this.metodo_pago = metodo_pago;
    this.descuento = Number(descuento);
    this.monto_total = Number(monto_total);
    this.comprobante_pago = comprobante_pago;
    this.impuestos = Number(impuestos);
    this.observaciones = observaciones;
    this.id_documento = id_documento ? Number(id_documento) : null;
  }

  async guardar(connection) {
    const [result] = await connection.execute(
      `INSERT INTO venta_contado (
        id_venta, metodo_pago, descuento, monto_total, comprobante_pago, impuestos, observaciones, id_documento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.id_venta, this.metodo_pago, this.descuento, this.monto_total,
        this.comprobante_pago, this.impuestos,
        this.observaciones, this.id_documento
      ]
    );
    this.id_venta_contado = result.insertId;
    return this;
  }

  static async obtenerPorVentaId(id_venta, connection) {
    const [rows] = await connection.execute(
      'SELECT * FROM venta_contado WHERE id_venta = ?',
      [id_venta]
    );
    return rows.length ? new VentaContado(rows[0]) : null;
  }

  toJSON() {
    return {
      id_venta_contado: this.id_venta_contado,
      id_venta: this.id_venta,
      metodo_pago: this.metodo_pago,
      descuento: this.descuento,
      monto_total: this.monto_total,
      comprobante_pago: this.comprobante_pago,
      impuestos: this.impuestos,
      observaciones: this.observaciones,
      id_documento: this.id_documento
    };
  }
}

module.exports = VentaContado;