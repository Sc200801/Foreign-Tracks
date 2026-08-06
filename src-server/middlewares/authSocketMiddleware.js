const jwt = require('jsonwebtoken');

/**
 * Middleware para validar el token JWT y vincular la identidad real del usuario al socket.
 */
const authSocketMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

  if (!token) {
    const err = new Error('Autenticación requerida');
    err.data = { code: 'NO_TOKEN' };
    return next(err);
  }

  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    
    // Desciframos la información que viene dentro del JWT
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'tu_clave_secreta');

    // 🔗 VINCULACIÓN: Guardamos los datos de identidad en la propiedad del socket
    // Soporta según la estructura de tu token si viene con role ('player'/'teacher') o id directo
    socket.user = {
      id: decoded.id || decoded.userId,
      role: decoded.role || 'player', // 'player' o 'teacher'
      playerId: decoded.playerId || (decoded.role === 'player' ? decoded.id : null),
      teacherId: decoded.teacherId || (decoded.role === 'teacher' ? decoded.id : null),
      name: decoded.name || decoded.username || 'Usuario'
    };

    next(); // Permite la conexión
  } catch (error) {
    const err = new Error('Token inválido o expirado');
    err.data = { code: 'INVALID_TOKEN' };
    return next(err);
  }
};

module.exports = authSocketMiddleware;