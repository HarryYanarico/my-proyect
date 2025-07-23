class DocumentoVenta {
  constructor({ id_documento, tipo_documento, fecha_emision, archivo_ruta, estado }) {
    this.id_documento = Number(id_documento);
    this.tipo_documento = tipo_documento;
    this.fecha_emision = new Date(fecha_emision);
    this.archivo_ruta = archivo_ruta;
    this.estado = estado;
  }
  static async obtenerPorId(id_documento, connection) {
    const [rows] = await connection.execute(
      'SELECT * FROM documentos_venta WHERE id_documento = ?',
      [id_documento]
    );
    return rows.length ? new DocumentoVenta(rows[0]) : null;
  }
  async guardar(connection) {
    const [result] = await connection.execute(
      `INSERT INTO documentos_venta (tipo_documento, fecha_emision, archivo_ruta, estado)
       VALUES (?, ?, ?, ?)`,
      [
        this.tipo_documento,
        this.fecha_emision instanceof Date ? this.fecha_emision.toISOString().slice(0, 19).replace('T', ' ') : this.fecha_emision,
        this.archivo_ruta,
        this.estado
      ]
    );
    this.id_documento = result.insertId;
    return this.id_documento;
  }
}
module.exports = DocumentoVenta;