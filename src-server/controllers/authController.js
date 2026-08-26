const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Player, Teacher } = require('../models');

// Clave secreta para firmar los tokens
const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, password, role, nombre, fullname, name } = req.body;
    const displayName = nombre || fullname || name || username;

    if (!username || !password || !role) {
      return res.status(400).json({ 
        message: 'Por favor proporciona username, password y role.' 
      });
    }

    // 🔍 VERIFICACIÓN CRUZADA: Consultar en ambas tablas antes de crear
    const existingTeacher = await Teacher.findOne({ where: { username } });
    const existingPlayer = await Player.findOne({ where: { username } });

    if (existingTeacher || existingPlayer) {
      return res.status(400).json({ 
        success: false,
        message: 'El username ya está en uso.' 
      });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    if (role === 'teacher') {
      const newTeacher = await Teacher.create({
        name: displayName,
        username: username,
        passwordHash: password_hash,
      });

      const teacherId = newTeacher.id_maestro || newTeacher.id;

      // 🔍 Incluimos tanto 'id' como 'userId' para máxima compatibilidad con roomHandler.js
      const token = jwt.sign(
        { id: teacherId, userId: teacherId, username: newTeacher.username, role: 'teacher' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Maestro registrado exitosamente.',
        token: token,
        user: { 
          id: teacherId, 
          userId: teacherId,
          username: newTeacher.username, 
          fullname: newTeacher.name,
          role: 'teacher',
          token: token 
        },
      });

    } else if (role === 'player') {
      const newPlayer = await Player.create({
        username: username,
        name: displayName,
        passwordHash: password_hash,
      });

      const playerId = newPlayer.id_jugador || newPlayer.id;

      const token = jwt.sign(
        { id: playerId, userId: playerId, username: newPlayer.username, role: 'player' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Jugador registrado exitosamente.',
        token: token,
        user: { 
          id: playerId, 
          userId: playerId,
          username: newPlayer.username, 
          fullname: newPlayer.name,
          role: 'player',
          token: token 
        },
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

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Proporciona username y password.' });
    }

    let userFound = null;
    let userId = null;
    let userFullname = '';
    let hashToCompare = '';
    let userRole = '';

    // 1. Buscar primero en la tabla de Profesores (Teachers)
    userFound = await Teacher.findOne({ where: { username } });

    if (userFound) {
      userId = userFound.id_maestro || userFound.id;
      userFullname = userFound.name || userFound.username;
      hashToCompare = userFound.passwordHash;
      userRole = 'teacher';
    } else {
      // 2. Si no se encuentra como profesor, buscar en la tabla de Alumnos (Players)
      userFound = await Player.findOne({ where: { username } });
      
      if (userFound) {
        userId = userFound.id_jugador || userFound.id;
        userFullname = userFound.name || userFound.username;
        hashToCompare = userFound.passwordHash;
        userRole = 'player';
      }
    }

    // 3. Si no existe en ninguna de las dos tablas
    if (!userFound) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // 4. Validar la contraseña encriptada
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    // 5. Generar token con el rol detectado automáticamente
    const token = jwt.sign(
      { id: userId, userId: userId, username: userFound.username, role: userRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      token: token,
      user: {
        id: userId,
        userId: userId,
        username: userFound.username,
        fullname: userFullname,
        role: userRole,
        token: token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error interno en el servidor.', error: error.message });
  }
};

// 🔒 POST /api/auth/teacher-login
const teacherLogin = async (req, res) => {
  try {
    const { teacherKey } = req.body;
    const expectedKey = process.env.TEACHER_KEY;

    if (!expectedKey || !teacherKey || teacherKey !== expectedKey) {
      return res.status(401).json({ 
        success: false, 
        message: 'La clave de docente ingresada es incorrecta.' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Acceso concedido como docente' 
    });

  } catch (error) {
    console.error('Error en teacherLogin:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno en el servidor al autenticar docente.',
      error: error.message 
    });
  }
};

// GET /api/auth/verify
const verifyToken = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, message: 'Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ 
      valid: true, 
      user: decoded,
      id: decoded.id || decoded.userId,
      username: decoded.username,
      role: decoded.role
    });
  } catch (error) {
    return res.status(401).json({ valid: false, message: 'Token expirado o inválido.' });
  }
};

// 🔍 GET /api/auth/check-username (Validación previa de disponibilidad)
const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ available: false, message: 'Username requerido.' });
    }

    const cleanUsername = username.trim();
    const existingTeacher = await Teacher.findOne({ where: { username: cleanUsername } });
    const existingPlayer = await Player.findOne({ where: { username: cleanUsername } });

    if (existingTeacher || existingPlayer) {
      return res.status(200).json({ available: false, message: 'El username ya está en uso.' });
    }

    return res.status(200).json({ available: true });
  } catch (error) {
    console.error('Error en checkUsername:', error);
    return res.status(500).json({ available: false, message: 'Error interno al validar usuario.' });
  }
};

module.exports = {
  register,
  login,
  teacherLogin,
  verifyToken,
  checkUsername
};