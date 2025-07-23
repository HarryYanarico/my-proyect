class Empleado {
    constructor(id, nombre, apellido, ci, telefono, email, password, direccion) {
        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.ci = ci;
        this.telefono = telefono;
        this.email = email;
        this.password = password;
        this.direccion = direccion;
    }

    static fromDB(row) {
        return new Empleado(row.id, row.nombre, row.apellido, row.ci, row.telefono, row.email, row.password, row.direccion);
    }

    // Método estático para obtener un empleado por ID
    static async obtenerPorId(id, connection) {
        try {
            // Ajusta esta consulta SQL y el método de conexión según tu base de datos
            const [rows] = await connection.execute(
                'SELECT * FROM Empleados WHERE id = ?',
                [id]
            );

            if (rows.length === 0) {
                return null; // Empleado no encontrado
            }

            // Usamos el método fromDB para crear una instancia de Empleado desde la fila de la DB
            return Empleado.fromDB(rows[0]);
        } catch (error) {
            console.error('Error al obtener empleado por ID:', error);
            throw error; // Re-lanza el error para que sea manejado donde se llama a esta función
        }
    }
}

module.exports = Empleado;