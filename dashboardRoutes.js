const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/stats', isAuthenticated, dashboardController.getStats);

module.exports = router;
