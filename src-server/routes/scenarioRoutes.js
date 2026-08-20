const express = require('express');
const router = express.Router();
const scenarioController = require('../controllers/scenarioController');

// GET /api/scenarios/hotel
router.get('/hotel', scenarioController.getHotelScenario);

module.exports = router;