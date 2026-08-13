const jwt = require('jsonwebtoken');

/**
 * Middleware para validar el token JWT y vincular la identidad real del usuario al socket.
 */
const authSocketMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

  // 1. SI NO HAY TOKEN: Permitir conexión limpia en lugar de tumbar el WebSockets
  if (!token) {
    console.warn('⚠️ Conexión Socket sin token inicial. Permitido como invitado temporal.');
    socket.user = {
      id: 'guest-' + socket.id,
      role: 'player',
      playerId: null,
      teacherId: null,
      name: 'Student'
    };
    return next(); // 🟢 Dejar pasar sin error
  }

  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    // 🟢 COMPATIBILIDAD EN DESARROLLO (Si el token es un demo-token generado en frontend)
    if (typeof cleanToken === 'string' && cleanToken.startsWith('demo-token')) {
      socket.user = {
        id: 'demo-user-123',
        role: 'teacher',
        playerId: 'demo-user-123',
        teacherId: 'demo-user-123',
        name: 'Usuario Demo'
      };
      return next();
    }
    
    // Desciframos la información que viene dentro del JWT real
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'mi_clave_secreta_super_segura');

    // Extraer el nombre probando todas las propiedades habituales de la BD/Registro
    const nombreUsuario = decoded.fullname || decoded.username || decoded.name || decoded.nombre || 'Student';

    // 🔗 VINCULACIÓN: Guardamos los datos de identidad en la propiedad del socket
    socket.user = {
      id: decoded.id || decoded.userId,
      role: decoded.role || 'player',
      playerId: decoded.playerId || (decoded.role === 'player' ? decoded.id : null),
      teacherId: decoded.teacherId || (decoded.role === 'teacher' ? decoded.id : null),
      name: nombreUsuario
    };

    next(); // Permite la conexión autenticada
  } catch (error) {
    console.warn('⚠️ Token inválido/expirado en Socket.io. Permitido como invitado:', error.message);
    // En caso de token inválido, tampoco cancelamos la conexión para no congelar la UI
    socket.user = {
      id: 'guest-' + socket.id,
      role: 'player',
      playerId: null,
      teacherId: null,
      name: 'Student'
    };
    next();
  }
};

module.exports = authSocketMiddleware;