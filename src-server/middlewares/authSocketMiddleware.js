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

    // 🟢 COMPATIBILIDAD EN DESARROLLO (Si el token es un demo-token generado en frontend)
    if (typeof cleanToken === 'string' && cleanToken.startsWith('demo-token')) {
      socket.user = {
        id: 'demo-user-123',
        role: 'teacher', // O 'player' según lo requieras
        playerId: 'demo-user-123',
        teacherId: 'demo-user-123',
        name: 'Usuario Demo'
      };
      return next(); // Permite la conexión directa
    }
    
    // Desciframos la información que viene dentro del JWT real
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'tu_clave_secreta');

    // 🔗 VINCULACIÓN: Guardamos los datos de identidad en la propiedad del socket
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