class Ubicacion {
    constructor({ id, latitud, longitud, calle, avenida, barrio, canton, punto_referencia }) {
        this.id = id;
        this.latitud = parseFloat(latitud);
        this.longitud = parseFloat(longitud);
        this.calle = calle;                   // string
        this.avenida = avenida;               // string
        this.barrio = barrio;                 // string
        this.canton = canton;                 // string
        
    }

    validate() {
        if (this.latitud < -90 || this.latitud > 90) {
            throw new Error("Latitud inválida (debe estar entre -90 y 90)");
        }
        if (this.longitud < -180 || this.longitud > 180) {
            throw new Error("Longitud inválida (debe estar entre -180 y 180)");
        }
    }

    async save() {
    this.validate();
    const [result] = await db.execute(
      `INSERT INTO ubicacion (latitud, longitud, calle, avenida, barrio, canton)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        this.latitud,
        this.longitud,
        this.calle,
        this.avenida,
        this.barrio,
        this.canton
      ]
    );
    this.id = result.insertId;
    return this.id;
  }

    static fromDB(row) {
        return new Ubicacion({
            id: row.id,
            latitud: row.latitud,
            longitud: row.longitud,
            calle: row.calle,
            avenida: row.avenida,
            barrio: row.barrio,
            canton: row.canton
        });
    }
}

module.exports = Ubicacion;