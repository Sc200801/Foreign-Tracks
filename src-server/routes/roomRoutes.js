const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Rutas API REST para las salas
router.get('/code/:accessCode', roomController.getRoomByCode);
router.get('/teacher/:teacherId', roomController.getRoomsByTeacher);
router.get('/:roomId/podium', roomController.getRoomPodium);

module.exports = router;