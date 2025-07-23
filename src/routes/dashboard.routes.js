const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/dashboard', dashboardController.getDashboardData);
router.get('/dashboard/monthly-sales', dashboardController.getMonthlySalesData);
router.get('/dashboard/cuotas-vencidas', dashboardController.obtenerCuotasVencidas);
router.get('/dashboard/ventas-recientes', dashboardController.obtenerVentasRecientes);

module.exports = router;