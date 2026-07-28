const bcrypt = require('bcryptjs');
const { Player, Teacher } = require('../models');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, password, role, nombre } = req.body;

    // 1. Validaciones básicas
    if (!username || !password || !role) {
      return res.status(400).json({ 
        message: 'Por favor proporciona username, password y role.' 
      });
    }

    // 2. Encriptar contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 3. Guardar según el rol (player o teacher)
    if (role === 'teacher') {
      if (!nombre) {
        return res.status(400).json({ 
          message: 'El nombre es obligatorio para registrar un maestro.' 
        });
      }

      // Verificar disponibilidad de username
      const existingTeacher = await Teacher.findOne({ where: { username } });
      if (existingTeacher) {
        return res.status(400).json({ message: 'El username ya está en uso.' });
      }

      const newTeacher = await Teacher.create({
        nombre,
        username,
        password_hash,
      });

      return res.status(201).json({
        message: 'Maestro registrado exitosamente.',
        user: { id: newTeacher.id_maestro, username: newTeacher.username, role: 'teacher' },
      });

    } else if (role === 'player') {
      // Verificar disponibilidad de username
      const existingPlayer = await Player.findOne({ where: { username } });
      if (existingPlayer) {
        return res.status(400).json({ message: 'El username ya está en uso.' });
      }

      const newPlayer = await Player.create({
        username,
        password_hash,
      });

      return res.status(201).json({
        message: 'Jugador registrado exitosamente.',
        user: { id: newPlayer.id_jugador, username: newPlayer.username, role: 'player' },
      });

    } else {
      return res.status(400).json({ message: 'Rol no válido. Debe ser "player" o "teacher".' });
    }

  } catch (error) {
    console.error('Error en el registro:', error);
    return res.status(500).json({ 
      message: 'Error interno del servidor al registrar usuario.',
      error: error.message 
    });
  }
};

module.exports = {
  register,
};