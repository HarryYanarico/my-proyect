//cuota.model.js
class Cuota {
  constructor({
    id_cuota,
    id_plan,
    monto_cuota,
    fecha_venc,
    estado = 'pendiente',
    fecha_pago = null,
    monto_pagado = 0
  }) {
    this.id_cuota = id_cuota ? Number(id_cuota) : null;
    this.id_plan = Number(id_plan);
    this.monto_cuota = Number(monto_cuota);
    this.fecha_venc = new Date(fecha_venc);
    this.estado = estado;
    this.fecha_pago = fecha_pago ? new Date(fecha_pago) : null;
    this.monto_pagado = Number(monto_pagado);
  }

  async guardar(connection) {
    const [result] = await connection.execute(
      `INSERT INTO cuotas (
        id_plan, monto_cuota, fecha_venc, estado, fecha_pago, monto_pagado
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        this.id_plan, this.monto_cuota, this.fecha_venc,
        this.estado, this.fecha_pago, this.monto_pagado
      ]
    );
    this.id_cuota = result.insertId;
    return this.insertId;
  }

  static async obtenerPorPlanId(id_plan, connection) {
    const [rows] = await connection.execute(
      'SELECT * FROM cuotas WHERE id_plan = ? ORDER BY fecha_venc',
      [id_plan]
    );
    return rows.map(row => new Cuota(row));
  }

  toJSON() {
    return {
      id_cuota: this.id_cuota,
      id_plan: this.id_plan,
      monto_cuota: this.monto_cuota,
      fecha_venc: this.fecha_venc.toISOString().split('T')[0],
      estado: this.estado,
      fecha_pago: this.fecha_pago ? this.fecha_pago.toISOString().split('T')[0] : null,
      monto_pagado: this.monto_pagado
    };
  }
}

module.exports = Cuota;