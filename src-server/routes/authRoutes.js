const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de autenticación
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-teacher-key', authController.verifyTeacherKey);

// Endpoint de verificación de sesión activa
router.get('/session', authController.checkSession);
router.post('/verify-teacher-key', authController.verifyTeacherKey); // NUEVA RUTA

module.exports = router;
