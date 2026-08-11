const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');// Para verificar contraseñas de forma segura
const { Teacher, Player } = require('../models');// <-- Aquí con Players en plural


// 1. Ruta para que el profesor Inicie Sesión
router.post('/login-teacher', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Buscamos si existe el usuario en la base de datos
    const teacher = await Teacher.findOne({ where: { username } });

    if (!teacher) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
    }

    // Comparamos la contraseña ingresada con la guardada
    const passwordValida = await bcrypt.compare(password, teacher.passwordHash);

    if (!passwordValida) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
    }

    // Si todo coincide, respondemos éxito
    res.json({
      success: true,
      teacher: { id: teacher.id, name: teacher.name, username: teacher.username }
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// 2. Ruta para que un nuevo Profesor se Registre
router.post('/register-teacher', async (req, res) => {
  const { name, username, password } = req.body;

  try {
    // Encriptamos la contraseña por seguridad
    const passwordHash = await bcrypt.hash(password, 10);

    // Creamos el nuevo registro en la tabla Teachers
    const newTeacher = await Teacher.create({ name, username, passwordHash });

    res.status(201).json({
      success: true,
      teacher: { id: newTeacher.id, name: newTeacher.name, username: newTeacher.username }
    });
  } catch (error) {
    console.error('Error al registrar:', error);
    res.status(500).json({ success: false, message: 'Error al crear la cuenta o el usuario ya existe' });
  }
});
router.post('/login-player', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Usamos Player (en singular)
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
// Ruta para Login / Auto-registro de Alumnos (Usando el modelo Players)
module.exports = router;
const authController = require('../controllers/authController');

// Rutas de autenticación
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-teacher-key', authController.verifyTeacherKey);

// Endpoint de verificación de sesión activa
router.get('/session', authController.checkSession);
router.post('/verify-teacher-key', authController.verifyTeacherKey); // NUEVA RUTA

module.exports = router;
