const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// GET /api/rooms/:roomId/turns - Obtiene los jugadores de una sala ordenados por turno de llegada
router.get('/:roomId/turns', roomController.getRoomTurnOrder);

module.exports = router;