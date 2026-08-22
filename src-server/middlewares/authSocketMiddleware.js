const jwt = require('jsonwebtoken');

/**
 * Middleware para validar el token JWT y vincular la identidad real del usuario al socket.
 */
const authSocketMiddleware = (socket, next) => {
  try {
    // 1. EXTRAER TOKEN DE DIVERSAS FUENTES
    const rawToken = socket.handshake.auth?.token || 
                     socket.handshake.headers?.authorization || 
                     socket.handshake.query?.token;

    // SI NO HAY TOKEN: Permitir conexión limpia como invitado
    if (!rawToken) {
      console.warn(`⚠️ Conexión Socket sin token inicial (Socket ID: ${socket.id}). Asignado como invitado.`);
      socket.user = {
        id: 'guest-' + socket.id,
        role: 'player',
        playerId: null,
        teacherId: null,
        name: 'Student'
      };
      return next(); // 🟢 Conexión exitosa
    }

    const cleanToken = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();

    // 2. COMPATIBILIDAD EN DESARROLLO (demo-token)
    if (typeof cleanToken === 'string' && cleanToken.startsWith('demo-token')) {
      socket.user = {
        id: 'demo-user-123',
        role: 'teacher',
        playerId: 'demo-user-123',
        teacherId: 'demo-user-123',
        name: 'Usuario Demo'
      };
      return next(); // 🟢 Conexión exitosa
    }

    // 3. VERIFICACIÓN Y DECODIFICACIÓN DEL JWT
    const secretKey = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';
    const decoded = jwt.verify(cleanToken, secretKey);

    // Compatibilidad con objetos anidados dentro de la payload del JWT (ej. { user: {...} })
    const payload = decoded.user || decoded.data || decoded;

    const nombreUsuario = payload.fullname || payload.username || payload.name || payload.nombre || 'Student';
    const userRole = payload.role || 'player';

    // 🔗 VINCULACIÓN DE IDENTIDAD AL SOCKET
    socket.user = {
      id: payload.id || payload.userId || socket.id,
      role: userRole,
      playerId: payload.playerId || (userRole === 'player' || userRole === 'estudiante' ? (payload.id || payload.userId) : null),
      teacherId: payload.teacherId || (userRole === 'teacher' || userRole === 'docente' ? (payload.id || payload.userId) : null),
      name: nombreUsuario
    };

    console.log(`🔑 Socket ${socket.id} autenticado con éxito (${socket.user.name} - ${socket.user.role})`);
    return next(); // 🟢 Conexión exitosa

  } catch (error) {
    console.warn(`⚠️ Token inválido/expirado en Socket.io (${error.message}). Permitiendo como invitado.`);
    
    // En caso de fallo de token, garantizamos que el socket no quede en limbo y no dispare timeout
    socket.user = {
      id: 'guest-' + socket.id,
      role: 'player',
      playerId: null,
      teacherId: null,
      name: 'Student'
    };
    
    return next(); // 🟢 Conexión exitosa (modo degradado a invitado)
  }
};

module.exports = authSocketMiddleware;