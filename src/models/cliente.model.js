//cliente.model.js
class Cliente {
  constructor({ id_cliente, nombre, apellido, direccion, telefono, nacionalidad, ci_nit }) {
    this.id_cliente = Number(id_cliente);
    this.nombre = nombre;
    this.apellido = apellido;
    this.direccion = direccion;
    this.telefono = telefono;
    this.nacionalidad = nacionalidad;
    this.ci_nit = ci_nit; 
  }

  static async obtenerPorId(id, connection) {
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM cliente WHERE id_cliente = ?',
        [id]
      );

      if (rows.length === 0) {
        return null; 
      }
      return new Cliente(rows[0]);
    } catch (error) {
      console.error('Error al obtener cliente por ID:', error);
      throw error;
    }
  }
  static async obtenerIdPorCiNit(ci_nit, connection) {
    try {
      const [rows] = await connection.execute(
        'SELECT id_cliente FROM cliente WHERE ci_nit = ?',
        [ci_nit]
      );

      if (rows.length === 0) {
        return null;
      }
      return rows[0].id_cliente;
    } catch (error) {
      console.error('Error al obtener ID del cliente por CI/NIT:', error);
      throw error;
    }
  }
}

module.exports = Cliente;