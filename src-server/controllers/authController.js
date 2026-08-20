const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // 🔑 Importamos JWT
const { Player, Teacher } = require('../models');

// Clave secreta para firmar los tokens
const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

// POST /api/auth/register
const register = async (req, res) => {
  try {
    // 🔑 Capturamos todas las posibles variantes de nombre que envíe el cliente
    const { username, password, role, nombre, fullname, name } = req.body;

    // Detectar el nombre real (prioriza nombre, luego fullname, name y por último username)
    const displayName = nombre || fullname || name || username;

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

      // Verificar disponibilidad de username
      const existingTeacher = await Teacher.findOne({ where: { username } });
      if (existingTeacher) {
        return res.status(400).json({ message: 'El username ya está en uso.' });
      }

      const newTeacher = await Teacher.create({
        name: displayName,
        username: username,
        passwordHash: password_hash,
      });

      const teacherId = newTeacher.id_maestro || newTeacher.id;

      // 🔑 Generar Token para el Maestro (7 días)
      const token = jwt.sign(
        { id: teacherId, username: newTeacher.username, role: 'teacher' },
        JWT_SECRET,
        { expiresIn: '7d' } // 👈 CAMBIADO A 7d
      );

      return res.status(201).json({
        message: 'Maestro registrado exitosamente.',
        token: token,
        user: { 
          id: teacherId, 
          username: newTeacher.username, 
          fullname: newTeacher.name,
          role: 'teacher',
          token: token 
        },
      });

    } else if (role === 'player') {
      // Verificar disponibilidad de username
      const existingPlayer = await Player.findOne({ where: { username } });
      if (existingPlayer) {
        return res.status(400).json({ message: 'El username ya está en uso.' });
      }

      const newPlayer = await Player.create({
        username: username,
        name: displayName,
        passwordHash: password_hash,
      });

      // 🔑 Generar Token para el Estudiante / Jugador (7 días)
      const playerId = newPlayer.id_jugador || newPlayer.id;
      const token = jwt.sign(
        { id: playerId, username: newPlayer.username, role: 'player' },
        JWT_SECRET,
        { expiresIn: '7d' } // 👈 CAMBIADO A 7d
      );

      return res.status(201).json({
        message: 'Jugador registrado exitosamente.',
        token: token,
        user: { 
          id: playerId, 
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
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Proporciona username, password y role.' });
    }

    let userFound = null;
    let userId = null;
    let userFullname = '';
    let hashToCompare = '';

    if (role === 'teacher') {
      userFound = await Teacher.findOne({ where: { username } });
      if (userFound) {
        userId = userFound.id_maestro || userFound.id;
        userFullname = userFound.name || userFound.username;
        hashToCompare = userFound.passwordHash;
      }
    } else if (role === 'player') {
      userFound = await Player.findOne({ where: { username } });
      if (userFound) {
        userId = userFound.id_jugador || userFound.id;
        userFullname = userFound.name || userFound.username;
        hashToCompare = userFound.passwordHash;
      }
    }

    if (!userFound) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    // 🔑 Generar Token JWT (7 días)
    const token = jwt.sign(
      { id: userId, username: userFound.username, role },
      JWT_SECRET,
      { expiresIn: '7d' } // 👈 CAMBIADO A 7d
    );

    return res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      token: token,
      user: {
        id: userId,
        username: userFound.username,
        fullname: userFullname,
        role: role,
        token: token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error interno en el servidor.', error: error.message });
  }
};

// 🔒 POST /api/auth/teacher-login (VERIFICACIÓN SEGURA DE CLAVE INSTITUCIONAL)
const teacherLogin = async (req, res) => {
  try {
    const { teacherKey } = req.body;

    // Compara directamente con TEACHER_KEY del .env (ADMIN123)
    if (!teacherKey || teacherKey !== process.env.TEACHER_KEY) {
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

// 🆕 GET /api/auth/verify (Método para que el frontend valide el token)
const verifyToken = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, message: 'Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ valid: true, user: decoded });
  } catch (error) {
    // Si el token expiró o es inválido, responde 401 Unauthorized
    return res.status(401).json({ valid: false, message: 'Token expirado o inválido.' });
  }
};

module.exports = {
  register,
  login,
  teacherLogin,
  verifyToken // 👈 Exportamos el nuevo método de verificación
};