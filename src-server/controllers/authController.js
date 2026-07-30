const bcrypt = require('bcryptjs');
const { Player, Teacher } = require('../models');

// 1. POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, password, role, nombre } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Proporciona username, password y role.' });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    if (role === 'teacher') {
      if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio para profesores.' });
      
      const existingTeacher = await Teacher.findOne({ where: { username } });
      if (existingTeacher) return res.status(400).json({ message: 'El username ya está registrado.' });

      const newTeacher = await Teacher.create({ nombre, username, password_hash });
      return res.status(201).json({
        message: 'Maestro registrado correctamente.',
        user: { id: newTeacher.id_maestro, username: newTeacher.username, role: 'teacher' }
      });

    } else if (role === 'player') {
      const existingPlayer = await Player.findOne({ where: { username } });
      if (existingPlayer) return res.status(400).json({ message: 'El username ya está registrado.' });

      const newPlayer = await Player.create({ username, password_hash });
      return res.status(201).json({
        message: 'Jugador registrado correctamente.',
        user: { id: newPlayer.id_jugador, username: newPlayer.username, role: 'player' }

      const newTeacher = await Teacher.create({ nombre, username, password_hash });
      return res.status(201).json({
        message: 'Maestro registrado correctamente.',
        user: { id: newTeacher.id_maestro, username: newTeacher.username, role: 'teacher' }
      });

    } else {
      return res.status(400).json({ message: 'Rol inválido. Usa "player" o "teacher".' });
    }

  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// 2. POST /api/auth/login
const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ 
        message: 'Por favor proporciona username, password y role.' 
      });
    }

    let user = null;
    let userId = null;

    if (role === 'teacher') {
      user = await Teacher.findOne({ where: { username } });
      if (user) userId = user.id_maestro;
    } else if (role === 'player') {
      user = await Player.findOne({ where: { username } });
      if (user) userId = user.id_jugador;
    } else {
      return res.status(400).json({ message: 'Rol no válido. Debe ser "player" o "teacher".' });
    }

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    return res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      user: {
        id: userId,
        username: user.username,
        nombre: user.nombre || null,
        role: role
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error en el servidor al iniciar sesión.', error: error.message });
  }
};

// 3. POST /api/auth/verify-teacher-key
const verifyTeacherKey = async (req, res) => {
  try {
    const { teacherKey } = req.body;

    if (!teacherKey) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Proporciona la clave especial de docente.' 
      const existingPlayer = await Player.findOne({ where: { username } });
      if (existingPlayer) return res.status(400).json({ message: 'El username ya está registrado.' });

      const newPlayer = await Player.create({ username, password_hash });
      return res.status(201).json({
        message: 'Jugador registrado correctamente.',
        user: { id: newPlayer.id_jugador, username: newPlayer.username, role: 'player' }
      });
    }

    const SECRET_KEY = process.env.TEACHER_SECRET_KEY || 'TEACHER2026';

    if (teacherKey === SECRET_KEY) {
      return res.status(200).json({ 
        valid: true, 
        message: 'Clave de docente verificada con éxito.' 
      });
    } else {
      return res.status(401).json({ 
        valid: false, 
        message: 'La clave ingresada es incorrecta.' 
      });
    }
  } catch (error) {
    console.error('Error al verificar clave de docente:', error);
    return res.status(500).json({ 
      valid: false, 
      message: 'Error interno en el servidor.', 
      error: error.message 
    });
  }
};

// 4. GET /api/auth/session 
const checkSession = async (req, res) => {
  try {
    const { userId, role } = req.query;

    if (!userId || !role) {
      return res.status(400).json({ 
        active: false, 
        message: 'Parámetros de sesión faltantes (userId y role requeridos).' 
    } else {
      return res.status(400).json({ message: 'Rol inválido. Usa "player" o "teacher".' });
    }

  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ 
        message: 'Por favor proporciona username, password y role.' 
      });
    }

    let user = null;

    if (role === 'teacher') {
      user = await Teacher.findByPk(userId);
    } else if (role === 'player') {
      user = await Player.findByPk(userId);
    let userId = null;

    if (role === 'teacher') {
      user = await Teacher.findOne({ where: { username } });
      if (user) userId = user.id_maestro;
    } else if (role === 'player') {
      user = await Player.findOne({ where: { username } });
      if (user) userId = user.id_jugador;
    } else {
      return res.status(400).json({ active: false, message: 'Rol no válido.' });
    }

    if (!user) {
      return res.status(404).json({ 
        active: false, 
        message: 'Sesión no encontrada o usuario inexistente.' 
      });
    }

    return res.status(200).json({
      active: true,
      message: 'Sesión activa.',
      user: {
        id: role === 'teacher' ? user.id_maestro : user.id_jugador,
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    return res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      user: {
        id: userId,
        username: user.username,
        nombre: user.nombre || null,
        role: role
      }
    });

  } catch (error) {
    console.error('Error al verificar sesión:', error);
    return res.status(500).json({ 
      active: false, 
      message: 'Error interno del servidor.', 
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error en el servidor al iniciar sesión.', error: error.message });
  }
};

// POST /api/auth/verify-teacher-key (NUEVO ENDPOINT)
const verifyTeacherKey = async (req, res) => {
  try {
    const { teacherKey } = req.body;

    if (!teacherKey) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Proporciona la clave especial de docente.' 
      });
    }

    // Clave secreta definida en .env o una valor por defecto
    const SECRET_KEY = process.env.TEACHER_SECRET_KEY || 'TEACHER2026';

    if (teacherKey === SECRET_KEY) {
      return res.status(200).json({ 
        valid: true, 
        message: 'Clave de docente verificada con éxito.' 
      });
    } else {
      return res.status(401).json({ 
        valid: false, 
        message: 'La clave ingresada es incorrecta.' 
      });
    }
  } catch (error) {
    console.error('Error al verificar clave de docente:', error);
    return res.status(500).json({ 
      valid: false, 
      message: 'Error interno en el servidor.', 
      error: error.message 
    });
  }
};

// Exportar todas las funciones juntas
module.exports = {
  register,
  login,
  verifyTeacherKey,
  checkSession,
};