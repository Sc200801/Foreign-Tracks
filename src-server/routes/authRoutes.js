const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Teacher, Player } = require('../models');
const authController = require('../controllers/authController');

// Rutas de autenticación unificadas (vía Controller)
router.post('/register', authController.register);
router.post('/login', authController.login);

// POST /api/auth/teacher-login (Validación de Clave Maestra e Inserción de Docente)
router.post('/teacher-login', authController.teacherLogin);

// 🔑 GET /api/auth/verify (Verificación del Token JWT para Auto-login / Expiración)
router.get('/verify', authController.verifyToken);

// 🔍 GET /api/auth/check-username (Validación previa de disponibilidad de usuario)
router.get('/check-username', authController.checkUsername);


// ===================================================
// RUTAS ESPECÍFICAS ADICIONALES
// ===================================================

// 1. Ruta para que el profesor Inicie Sesión individualmente
router.post('/login-teacher', async (req, res) => {
  const { username, password } = req.body;

  try {
    const teacher = await Teacher.findOne({ where: { username } });

    if (!teacher) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
    }

    const passwordValida = await bcrypt.compare(password, teacher.passwordHash);

    if (!passwordValida) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
    }

    res.json({
      success: true,
      teacher: { id: teacher.id, name: teacher.name, username: teacher.username }
    });
  } catch (error) {
    console.error('Error en el login-teacher:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// 2. Ruta para que un nuevo Profesor se Registre individualmente
router.post('/register-teacher', async (req, res) => {
  const { name, username, password } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const newTeacher = await Teacher.create({ name, username, passwordHash });

    res.status(201).json({
      success: true,
      teacher: { id: newTeacher.id, name: newTeacher.name, username: newTeacher.username }
    });
  } catch (error) {
    console.error('Error al registrar profesor:', error);
    res.status(500).json({ success: false, message: 'Error al crear la cuenta o el usuario ya existe' });
  }
});

// 3. Ruta para Login / Auto-registro de Alumnos
router.post('/login-player', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const [player, created] = await Player.findOrCreate({
      where: { username },
      defaults: {
        name: username,
        passwordHash: await bcrypt.hash(password, 10)
      }
    });

    if (!created) {
      const isMatch = await bcrypt.compare(password, player.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Contraseña incorrecta para este alumno' });
      }
    }

    return res.json({ success: true, player });
  } catch (error) {
    console.error('Error en login-player:', error);
    return res.status(500).json({ error: 'Error en el servidor al autenticar alumno' });
  }
});

// EXPORTACIÓN ÚNICA AL FINAL DEL ARCHIVO
module.exports = router;