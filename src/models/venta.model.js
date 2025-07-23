class Venta {
  constructor({ id_venta, fecha_venta, tipo_venta }) {
    this.id_venta = Number(id_venta);
    this.fecha_venta = new Date(fecha_venta);
    this.tipo_venta = tipo_venta; // "contado" o "credito"

    // Relaciones
    this.cliente = null; // Persona o Institución
    this.lote = null;
    this.empleado = null;

    // Según tipo_venta
    this.ventaContado = null;   // VentaContado
    this.ventaCredito = null;   // VentaCredito
    this.documentoVenta = null; // DocumentoVenta
  }

  setCliente(cliente) {
    this.cliente = cliente;
  }

  setLote(lote) {
    this.lote = lote;
  }

  setEmpleado(empleado) {
    this.empleado = empleado;
  }

  setVentaContado(ventaContado) {
    this.ventaContado = ventaContado;
  }

  setVentaCredito(ventaCredito) {
    this.ventaCredito = ventaCredito;
  }

  setDocumentoVenta(documento) {
    this.documentoVenta = documento;
  }

  static fromDB(row) {
    return new Venta({
      id_venta: row.id_venta,
      fecha_venta: row.fecha_venta,
      tipo_venta: row.tipo_venta,
    });
  }
  static async obtenerPorId(id_venta, connection) {
  const [rows] = await connection.execute(
    'SELECT * FROM venta WHERE id_venta = ?',
    [id_venta]
  );
  return rows.length ? Venta.fromDB(rows[0]) : null;
}
  async guardar(connection) {
    // Se asume que los IDs de cliente, empleado y lote están en las relaciones
    const id_cliente = this.cliente?.id || this.cliente?.id_cliente;
    const id_empleado = this.empleado?.id || this.empleado?.id_empleado;
    const id_lote = this.lote?.id_lote || this.lote?.id;
    if (!id_cliente || !id_empleado || !id_lote) {
      throw new Error('Faltan relaciones (id_cliente, id_empleado o id_lote) para guardar la venta');
    }
    const [result] = await connection.execute(
      `INSERT INTO venta (fecha_venta, tipo_venta, id_cliente, id_empleado, id_lote)
       VALUES (?, ?, ?, ?, ?)`,
      [
        this.fecha_venta instanceof Date ? this.fecha_venta.toISOString().slice(0, 19).replace('T', ' ') : this.fecha_venta,
        this.tipo_venta,
        id_cliente,
        id_empleado,
        id_lote
      ]
    );
    this.id_venta = result.insertId;
    return this.id_venta;
  }

  toJSON() {
    return {
      id_venta: this.id_venta,
      fecha_venta: this.fecha_venta,
      tipo_venta: this.tipo_venta,
      cliente: this.cliente,
      lote: this.lote,
      empleado: this.empleado,
      ventaContado: this.ventaContado,
      ventaCredito: this.ventaCredito,
      documentoVenta: this.documentoVenta
    };
  }
}
module.exports = Venta;