const pool = require('../config/db'); // Importa el pool de conexiones

exports.getDashboardData = async (req, res) => {
  try {
    // totalClientes
    const [totalClientesResult] = await pool.query('SELECT COUNT(*) AS totalClientes FROM cliente');
    const totalClientes = totalClientesResult[0].totalClientes;

    // lotesDisponibles
    const [lotesDisponiblesResult] = await pool.query("SELECT COUNT(*) AS lotesDisponibles FROM lotes WHERE estado = 'disponible'");
    const lotesDisponibles = lotesDisponiblesResult[0].lotesDisponibles;

    // lotesVendidos
    const [lotesVendidosResult] = await pool.query("SELECT COUNT(*) AS lotesVendidos FROM lotes WHERE estado = 'vendido'");
    const lotesVendidos = lotesVendidosResult[0].lotesVendidos;

    // ventasDelMes (ventas realizadas en el mes actual)
    const currentMonth = new Date().getMonth() + 1; // getMonth() es 0-indexed
    const currentYear = new Date().getFullYear();
    const [ventasDelMesResult] = await pool.query(
      `SELECT COUNT(*) AS ventasDelMes FROM venta WHERE MONTH(fecha_venta) = ? AND YEAR(fecha_venta) = ?`,
      [currentMonth, currentYear]
    );
    const ventasDelMes = ventasDelMesResult[0].ventasDelMes;

    // ingresosMes (suma de montos_total de ventas al contado y cuotas pagadas en el mes actual)
    // Ingresos por ventas al contado del mes
    const [ingresosContadoMesResult] = await pool.query(
        `SELECT SUM(vc.monto_total) AS ingresosContado FROM venta_contado vc
         JOIN venta v ON vc.id_venta = v.id_venta
         WHERE MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) = ?`,
        [currentMonth, currentYear]
    );
    // Asegurar que sea un número, incluso si es null
    const ingresosContadoMes = parseFloat(ingresosContadoMesResult[0].ingresosContado) || 0;

    // Ingresos por cuotas pagadas en el mes
    const [ingresosCuotasMesResult] = await pool.query(
        `SELECT SUM(pc.monto) AS ingresosCuotas FROM pago_cuota pc
         WHERE MONTH(pc.fecha_pago) = ? AND YEAR(pc.fecha_pago) = ?`,
        [currentMonth, currentYear]
    );
    // Asegurar que sea un número, incluso si es null
    const ingresosCuotasMes = parseFloat(ingresosCuotasMesResult[0].ingresosCuotas) || 0;

    const ingresosMes = ingresosContadoMes + ingresosCuotasMes;


    // cuotasPendientes (cuotas con estado 'pendiente')
    const [cuotasPendientesResult] = await pool.query("SELECT COUNT(*) AS cuotasPendientes FROM cuotas WHERE estado = 'pendiente'");
    const cuotasPendientes = cuotasPendientesResult[0].cuotasPendientes;

    // empleadosActivos (asumiendo que todos los empleados en la tabla 'empleados' están activos)
    const [empleadosActivosResult] = await pool.query('SELECT COUNT(*) AS empleadosActivos FROM empleados');
    const empleadosActivos = empleadosActivosResult[0].empleadosActivos;

    res.json({
      totalClientes,
      lotesDisponibles,
      lotesVendidos,
      ventasDelMes,
      ingresosMes: parseFloat(ingresosMes.toFixed(2)), // Aquí ya es seguro usar toFixed
      cuotasPendientes,
      empleadosActivos
    });

  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.getMonthlySalesData = async (req, res) => 
{
    try {
        let { page, limit = 4, year } = req.query; // Paginación: por defecto límite 4 meses. `year` es opcional.

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // getMonth() es 0-indexed

        // Nombres de los meses en español
        const monthNamesEs = [
            'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];

        const targetYear = year ? parseInt(year) : currentYear;
        
        limit = parseInt(limit);
        page = parseInt(page || 1); // Asegurar que page es un número y por defecto 1

        // --- Paso 1: Determinar el rango de meses a mostrar ---
        let startMonth, endMonth, startYear, endYear;
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth(); // 0-indexed

        if (!req.query.page && !req.query.year) {
            // Lógica para los últimos 4 meses del cuatrimestre actual
            // Queremos los últimos 4 meses terminando en el mes actual.
            // Ejemplo: si es Julio (6 en 0-indexed), queremos [Abr, May, Jun, Jul]
            endMonth = todayMonth; // Actual month 0-11
            endYear = todayYear;
            startMonth = (endMonth - (limit - 1)); // Restamos 3 para obtener 4 meses en total
            startYear = endYear;

            if (startMonth < 0) { // Si el inicio del rango cruza el año anterior
                startYear--;
                startMonth += 12; // Ajustar a un mes válido del año anterior
            }
        } else {
            // Lógica para paginación normal o año específico
            // Primero, obtenemos el primer y último mes con ventas en la DB para el año objetivo
            // o para todos los años si no se especifica 'year'.
            const [minMaxMonthYearResult] = await pool.query(`
                SELECT 
                    MIN(CONCAT(YEAR(fecha_venta), LPAD(MONTH(fecha_venta), 2, '0'))) AS min_ym,
                    MAX(CONCAT(YEAR(fecha_venta), LPAD(MONTH(fecha_venta), 2, '0'))) AS max_ym
                FROM venta
                ${year ? 'WHERE YEAR(fecha_venta) = ?' : ''};
            `, year ? [targetYear] : []);

            let minYM = minMaxMonthYearResult[0].min_ym;
            let maxYM = minMaxMonthYearResult[0].max_ym;

            if (!minYM || !maxYM) {
                // No hay datos de ventas en la DB, retornar una estructura vacía o con 0s
                return res.json({
                    data: [],
                    paginaActual: page,
                    totalPaginas: 0
                });
            }

            // Parsear el año y el mes inicial y final
            startYear = parseInt(minYM.substring(0, 4));
            startMonth = parseInt(minYM.substring(4, 6)) - 1; // 0-indexed
            endYear = parseInt(maxYM.substring(0, 4));
            endMonth = parseInt(maxYM.substring(4, 6)) - 1; // 0-indexed

            if (year) { // Si se especificó un año, el rango es solo para ese año
                startYear = targetYear;
                startMonth = 0; // Enero (0-indexed)
                endYear = targetYear;
                endMonth = 11; // Diciembre (0-indexed)
            }
        }

        const fullMonthRange = [];
        let currentIterYear = startYear;
        let currentIterMonth = startMonth;

        // Generar todos los meses en el rango deseado
        // Asegúrate de que el bucle no sea infinito en caso de rangos muy grandes.
        // Para la lógica por defecto de 4 meses, esto es directo.
        // Para un rango completo de la DB, hay que ser cuidadoso.
        if (!req.query.page && !req.query.year) { // Lógica para los 4 meses del cuatrimestre actual
            for (let i = 0; i < limit; i++) {
                let month = (startMonth + i) % 12;
                let year = startYear + Math.floor((startMonth + i) / 12);
                if (monthNamesEs[month]) { // Asegura que el mes es válido (0-11)
                     fullMonthRange.push({ month_num: month + 1, year_num: year });
                }
            }
        } else { // Lógica para un rango completo de meses con paginación
            let totalMonthsInAllRange = 0;
            let tempYear = startYear;
            let tempMonth = startMonth;

            // Calcular el total de meses en el rango general (para totalPaginas)
            while (true) {
                totalMonthsInAllRange++;
                if (tempYear === endYear && tempMonth === endMonth) break;

                tempMonth++;
                if (tempMonth > 11) {
                    tempMonth = 0;
                    tempYear++;
                }
                if (tempYear > endYear && tempMonth > endMonth) break; // Evitar bucle infinito si algo sale mal
            }
            
            const totalPages = Math.ceil(totalMonthsInAllRange / limit);
            const offsetMonths = (page - 1) * limit;

            // Avanzar hasta el offset para empezar a generar el rango para la página actual
            tempYear = startYear;
            tempMonth = startMonth;
            for (let i = 0; i < offsetMonths; i++) {
                tempMonth++;
                if (tempMonth > 11) {
                    tempMonth = 0;
                    tempYear++;
                }
            }

            // Generar los meses para la página actual
            for (let i = 0; i < limit; i++) {
                if (tempYear > endYear || (tempYear === endYear && tempMonth > endMonth)) {
                    break; // No hay más meses en el rango
                }
                fullMonthRange.push({ month_num: tempMonth + 1, year_num: tempYear });

                tempMonth++;
                if (tempMonth > 11) {
                    tempMonth = 0;
                    tempYear++;
                }
            }
        }

        // --- Paso 2: Obtener los datos de ventas existentes desde la DB ---
        // La consulta SQL es la misma, pero ahora solo necesitamos los datos que existen.
        // No usaremos LIMIT ni OFFSET en esta consulta SQL, ya que el filtrado y paginación
        // se harán en el backend después de combinar con el rango completo.

        let dbSalesQuery = `
            SELECT
                MONTH(v.fecha_venta) AS month_num,
                YEAR(v.fecha_venta) AS year_num,
                SUM(CASE WHEN v.tipo_venta = 'contado' THEN 1 ELSE 0 END) AS contado_count,
                SUM(CASE WHEN v.tipo_venta = 'credito' THEN 1 ELSE 0 END) AS credito_count
            FROM
                venta v
            WHERE 1=1
        `;
        let dbSalesQueryParams = [];

        // Si se especificó un año, filtramos la consulta de la DB por ese año.
        if (year) {
            dbSalesQuery += ` AND YEAR(v.fecha_venta) = ?`;
            dbSalesQueryParams.push(targetYear);
        } else if (!req.query.page) { // Si es el modo por defecto de 4 meses del cuatrimestre
             if (startMonth <= endMonth) { // Rango dentro del mismo año
                dbSalesQuery += ` AND YEAR(v.fecha_venta) = ? AND MONTH(v.fecha_venta) BETWEEN ? AND ?`;
                dbSalesQueryParams.push(endYear, startMonth + 1, endMonth + 1); // +1 porque SQL meses son 1-indexed
            } else { // Rango cruza el año
                dbSalesQuery += ` AND ((YEAR(v.fecha_venta) = ? AND MONTH(v.fecha_venta) >= ?) OR (YEAR(v.fecha_venta) = ? AND MONTH(v.fecha_venta) <= ?))`;
                dbSalesQueryParams.push(startYear, startMonth + 1, endYear, endMonth + 1);
            }
        }
        
        dbSalesQuery += ` GROUP BY year_num, month_num ORDER BY year_num ASC, month_num ASC;`;

        const [dbSalesData] = await pool.query(dbSalesQuery, dbSalesQueryParams);

        // --- Paso 3: Combinar los datos ---
        const salesMap = new Map();
        dbSalesData.forEach(row => {
            const key = `${row.year_num}-${row.month_num}`;
            salesMap.set(key, {
                contado: parseInt(row.contado_count),
                credito: parseInt(row.credito_count),
                total: parseInt(row.contado_count) + parseInt(row.credito_count)
            });
        });

        const formattedData = fullMonthRange.map(monthInfo => {
            const key = `${monthInfo.year_num}-${monthInfo.month_num}`;
            const existingData = salesMap.get(key) || { contado: 0, credito: 0, total: 0 };
            
            return {
                mes: monthNamesEs[monthInfo.month_num - 1],
                año: monthInfo.year_num,
                contado: existingData.contado,
                credito: existingData.credito,
                total: existingData.total
            };
        });

        // --- Calcular paginación final ---
        // totalMonthsInAllRange ya se calcula en el paso 1 si la paginación no es por defecto
        let totalMonthsInAllRange = 0;
        if (req.query.page || req.query.year) { // Solo si estamos en modo paginado o filtrado por año
            const [totalMonthsResult] = await pool.query(`
                SELECT COUNT(DISTINCT CONCAT(YEAR(fecha_venta), '-', MONTH(fecha_venta))) AS total_months
                FROM venta
                WHERE 1=1 ${year ? `AND YEAR(fecha_venta) = ?` : ''};
            `, year ? [targetYear] : []);
            totalMonthsInAllRange = totalMonthsResult[0].total_months;
        } else { // Si es por defecto (últimos 4 meses), total de meses a considerar es solo 4
            totalMonthsInAllRange = limit; // O el número real de meses generados si el rango es menor a 4.
        }
        
        const totalPages = Math.ceil(totalMonthsInAllRange / limit);


        res.json({
            data: formattedData,
            paginaActual: page,
            totalPaginas: totalPages
        });

    } catch (error) {
        console.error('Error al obtener datos de ventas mensuales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

exports.obtenerCuotasVencidas = async (req, res) => {
    try {
        let { page, year } = req.query; // 'limit' ya no es un query param para la paginación de meses
        const ITEMS_PER_MONTH_LIMIT = 5; // Límite fijo de cuotas por mes, como lo pediste.

        const monthNamesEs = [
            'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-indexed para cálculos de rango
        
        page = parseInt(page || 1); // Asegurar que page es un número y por defecto 1
        const limitMonths = 4; // Siempre mostramos 4 meses por "página" de la misma forma que getMonthlySalesData

        // --- Paso 1: Determinar el rango de meses a mostrar ---
        let startMonth, endMonth, startYear, endYear;
        const todayYear = new Date().getFullYear();
        const todayMonth = new Date().getMonth(); // 0-indexed

        if (!req.query.page && !req.query.year) {
            // Lógica para los últimos 4 meses del cuatrimestre actual
            endMonth = todayMonth; // Mes actual 0-11
            endYear = todayYear;
            startMonth = (endMonth - (limitMonths - 1)); // Restamos 3 para obtener 4 meses en total
            startYear = endYear;

            if (startMonth < 0) { // Si el inicio del rango cruza el año anterior
                startYear--;
                startMonth += 12; // Ajustar a un mes válido del año anterior
            }
        } else {
            // Lógica para paginación normal o año específico
            // Primero, obtenemos el primer y último mes con cuotas vencidas en la DB para el año objetivo
            // o para todos los años si no se especifica 'year'.
            const [minMaxMonthYearResult] = await pool.query(`
                SELECT 
                    MIN(CONCAT(YEAR(fecha_venc), LPAD(MONTH(fecha_venc), 2, '0'))) AS min_ym,
                    MAX(CONCAT(YEAR(fecha_venc), LPAD(MONTH(fecha_venc), 2, '0'))) AS max_ym
                FROM cuotas
                WHERE estado = 'pendiente' AND fecha_venc < CURDATE()
                ${year ? 'AND YEAR(fecha_venc) = ?' : ''};
            `, year ? [parseInt(year)] : []);

            let minYM = minMaxMonthYearResult[0].min_ym;
            let maxYM = minMaxMonthYearResult[0].max_ym;

            if (!minYM || !maxYM) {
                // No hay datos de cuotas vencidas en la DB, retornar una estructura vacía
                return res.json({
                    data: [],
                    paginaActual: page,
                    totalPaginas: 0,
                    totalCuotasPorMes: 0 // Indicador de que no hay cuotas
                });
            }

            // Parsear el año y el mes inicial y final
            startYear = parseInt(minYM.substring(0, 4));
            startMonth = parseInt(minYM.substring(4, 6)) - 1; // 0-indexed
            endYear = parseInt(maxYM.substring(0, 4));
            endMonth = parseInt(maxYM.substring(4, 6)) - 1; // 0-indexed

            if (year) { // Si se especificó un año, el rango es solo para ese año
                startYear = parseInt(year);
                startMonth = 0; // Enero (0-indexed)
                endYear = parseInt(year);
                endMonth = 11; // Diciembre (0-indexed)
            }
        }

        const fullMonthRange = [];
        let tempYear = startYear;
        let tempMonth = startMonth;

        // Calcular el total de meses en el rango general (para totalPaginas)
        let totalMonthsInAllRange = 0;
        let controlLoopYear = startYear;
        let controlLoopMonth = startMonth;
        while (true) {
            totalMonthsInAllRange++;
            if (controlLoopYear === endYear && controlLoopMonth === endMonth) break;

            controlLoopMonth++;
            if (controlLoopMonth > 11) {
                controlLoopMonth = 0;
                controlLoopYear++;
            }
            // Pequeña seguridad para evitar bucles infinitos si hay datos inconsistentes
            if (controlLoopYear > endYear + 1) break; 
        }
        
        const totalPages = Math.ceil(totalMonthsInAllRange / limitMonths);
        const offsetMonths = (page - 1) * limitMonths;

        // Avanzar hasta el offset para empezar a generar el rango para la página actual
        tempYear = startYear;
        tempMonth = startMonth;
        for (let i = 0; i < offsetMonths; i++) {
            tempMonth++;
            if (tempMonth > 11) {
                tempMonth = 0;
                tempYear++;
            }
            if (tempYear > endYear + 1) break; // Seguridad adicional
        }

        // Generar los meses para la página actual (solo los 4 meses)
        for (let i = 0; i < limitMonths; i++) {
            if (tempYear > endYear || (tempYear === endYear && tempMonth > endMonth)) {
                break; // No hay más meses en el rango total
            }
            fullMonthRange.push({ month_num: tempMonth + 1, year_num: tempYear });

            tempMonth++;
            if (tempMonth > 11) {
                tempMonth = 0;
                tempYear++;
            }
        }
        
        const dataForResponse = [];

        for (const monthInfo of fullMonthRange) {
            let cuotasQuery = `
                SELECT
                    cu.id_cuota,
                    cl.nombre AS nombre_cliente,
                    cl.apellido AS apellido_cliente,
                    l.nombre AS nombre_lote,
                    cu.monto_cuota,
                    cu.fecha_venc,
                    DATEDIFF(CURDATE(), cu.fecha_venc) AS diasVencido
                FROM
                    cuotas cu
                JOIN
                    planes_pago pp ON cu.id_plan = pp.id_plan_pago
                JOIN
                    venta_credito vc ON pp.id_venta_credito = vc.id_venta_credito
                JOIN
                    venta v ON vc.id_venta = v.id_venta
                JOIN
                    cliente cl ON v.id_cliente = cl.id_cliente
                JOIN
                    lotes l ON v.id_lote = l.id_lote
                WHERE
                    cu.estado = 'pendiente' 
                    AND cu.fecha_venc < CURDATE()
                    AND MONTH(cu.fecha_venc) = ? 
                    AND YEAR(cu.fecha_venc) = ?
                ORDER BY
                    cu.fecha_venc ASC, diasVencido DESC
                LIMIT ?;
            `;
            const [cuotasVencidasMes] = await pool.query(cuotasQuery, [
                monthInfo.month_num, 
                monthInfo.year_num, 
                ITEMS_PER_MONTH_LIMIT
            ]);

            const formattedCuotas = cuotasVencidasMes.map(item => ({
                id_cuota: item.id_cuota,
                cliente: `${item.nombre_cliente} ${item.apellido_cliente}`,
                lote: item.nombre_lote,
                monto: parseFloat(item.monto_cuota),
                fecha_vencimiento: item.fecha_venc ? item.fecha_venc.toISOString().split('T')[0] : null, // Formatear a YYYY-MM-DD
                diasVencido: parseInt(item.diasVencido)
            }));

            dataForResponse.push({
                mes: monthNamesEs[monthInfo.month_num - 1],
                año: monthInfo.year_num,
                cuotasVencidas: formattedCuotas
            });
        }

        res.json({
            data: dataForResponse,
            paginaActual: page,
            totalPaginas: totalPages
        });

    } catch (error) {
        console.error('Error al obtener cuotas vencidas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

exports.obtenerVentasRecientes = async (req, res) => {
    try {
        const [ventasRecientesDB] = await pool.query(`
            SELECT
                v.id_venta,
                v.fecha_venta,
                v.tipo_venta,
                cl.nombre AS nombre_cliente,
                cl.apellido AS apellido_cliente,
                l.nombre AS nombre_lote,
                vc.monto_total AS monto_contado,
                vcr.cuota_inicial AS monto_credito_inicial
            FROM
                venta v
            JOIN
                cliente cl ON v.id_cliente = cl.id_cliente
            JOIN
                lotes l ON v.id_lote = l.id_lote
            LEFT JOIN
                venta_contado vc ON v.id_venta = vc.id_venta AND v.tipo_venta = 'contado'
            LEFT JOIN
                venta_credito vcr ON v.id_venta = vcr.id_venta AND v.tipo_venta = 'credito'
            ORDER BY
                v.fecha_venta DESC
            LIMIT 5;
        `);

        const ventasRecientesFormateadas = ventasRecientesDB.map(venta => { 
            let montoTotal = 0;
            if (venta.tipo_venta === 'contado') {
                montoTotal = parseFloat(venta.monto_contado || 0);
            } else if (venta.tipo_venta === 'credito') {
                montoTotal = parseFloat(venta.monto_credito_inicial || 0);
            }

            return {
                idVenta: venta.id_venta,
                fechaVenta: venta.fecha_venta,
                tipoVenta: venta.tipo_venta,
                cliente: `${venta.nombre_cliente} ${venta.apellido_cliente}`,
                lote: venta.nombre_lote,
                monto: montoTotal
            };
        });

        res.json({
            ventasRecientes: ventasRecientesFormateadas
        });

    } catch (error) {
        console.error('Error al obtener ventas recientes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};