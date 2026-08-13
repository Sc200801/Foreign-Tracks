const jwt = require('jsonwebtoken');
const { GroupRoom } = require('../models'); // Importamos el modelo de Sequelize

const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

// Almacén en memoria para guardar el estado de las salas activas en tiempo real
// Estructura: { roomId: { name, hostId, dbRoomId, players: [ { id, name, isReady } ] } }
const rooms = {};

module.exports = (io, socket) => {

  // 1. CREAR SALA (Profesor / Host)
  socket.on('room:create', async (data) => {
    const { roomId, roomName, username } = data || {};

    if (!roomId) return;

    try {
      // 🔑 Extraer token JWT enviado por el socket
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      let teacherId = null;

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded.role === 'teacher' || decoded.role === 'docente') {
            teacherId = decoded.id || decoded.userId;
          }
        } catch (tokenErr) {
          console.warn('⚠️ Token JWT no válido o expirado en room:create:', tokenErr.message);
        }
      }

      console.log('\n===========================================');
      console.log('🚀 ¡SALA CREADA EN ROOMHANDLER.JS!');
      console.log(`👨‍🏫 Profesor (Host): ${username || 'Profesor'} (ID DB: ${teacherId || 'N/A'})`);
      console.log(`🏠 Sala: ${roomName}`);
      console.log(`🔑 Código ID: ${roomId}`);
      console.log('===========================================\n');

      let nuevaSalaDB = null;

      // 💾 GUARDAR EN MARIADB (GroupRooms)
      if (teacherId) {
        nuevaSalaDB = await GroupRoom.create({
          groupName: roomName || `Sala ${roomId}`,
          accessCode: roomId,
          teacherId: teacherId
        });
        console.log(`💾 Sala registrada en MariaDB exitosamente (ID Registro: ${nuevaSalaDB.id})`);
      } else {
        console.warn('⚠️ No se pudo obtener el ID del docente desde el JWT. La sala funcionará solo en memoria.');
      }

      // Unir el socket del profesor a la sala de Socket.io
      socket.join(roomId);

      // Guardar la sala en la memoria en tiempo real
      rooms[roomId] = {
        name: roomName,
        roomId: roomId,
        dbRoomId: nuevaSalaDB ? nuevaSalaDB.id : null,
        hostId: socket.id,
        teacherId: teacherId,
        players: []
      };

      // Confirmar al profesor que la sala fue creada
      socket.emit('room:created', {
        success: true,
        roomId,
        roomName,
        dbId: nuevaSalaDB ? nuevaSalaDB.id : null
      });

      // Enviar el estado limpio de la sala
      io.to(roomId).emit('room:update', rooms[roomId]);

    } catch (error) {
      console.error('❌ Error al guardar la sala en MariaDB:', error);
      const errorMsg = 'Ocurrió un problema al registrar la sala en la base de datos.';
      socket.emit('room:error', { message: errorMsg });
    }
  });

  // 2. UNIRSE A UNA SALA DE JUEGO (Estudiante)
  const handleJoinRoom = (data) => {
    const targetRoomId = data?.roomId || data?.roomCode;
    let username = data?.username;

    if (!targetRoomId) {
      const errorMsg = 'Debes proporcionar un código de sala.';
      socket.emit('room:error', { message: errorMsg });
      return;
    }

    // Verificar si la sala existe
    if (!rooms[targetRoomId]) {
      const errorMsg = 'La sala especificada no existe o fue cerrada.';
      socket.emit('room:error', { message: errorMsg });
      return;
    }

    const room = rooms[targetRoomId];

    // 🟢 BUSCAR NOMBRE EN MÚLTIPLES FUENTES (Paso seguro)
    // 1ro: Verificar si el nombre recibido en el payload es válido
    if (username && username !== 'Estudiante' && username !== 'Student') {
      username = username.trim();
    } else {
      username = null; // Reiniciar si vino un texto por defecto
    }

    // 2do: Priorizar datos decodificados por el middleware si existen
    if (!username && socket.user) {
      username = socket.user.fullname || socket.user.username || socket.user.name;
    }

    // 3ro: Intentar decodificar el token directo si aún no hay nombre
    if (!username) {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const raw = decoded.user || decoded.data || decoded;
          username = raw.fullname || raw.username || raw.name || raw.nombre;
        } catch (e) {
          console.warn('⚠️ No se pudo decodificar el token JWT al unirse a la sala:', e.message);
        }
      }
    }

    // Asignación final con respaldo garantizado
    const finalUsername = (username && username.trim().length > 0) 
      ? username.trim() 
      : `Jugador-${socket.id.slice(0, 4)}`;

    // 🔍 BUSCAR SI EL JUGADOR YA ESTABA EN LA SALA
    let jugadorExistente = room.players.find(p => p.id === socket.id);
    
    if (!jugadorExistente && finalUsername && !finalUsername.startsWith('Jugador-')) {
        // Solo busca por nombre exacto si no es un ID genérico generado
        jugadorExistente = room.players.find(p => p.name.toLowerCase() === finalUsername.toLowerCase());
    }

    if (jugadorExistente) {
      // Actualizar ID y Nombre en caso de reconexión o cambio de pestaña
      console.log(`🔄 Reconectando/Actualizando jugador "${finalUsername}" (Socket ID: ${socket.id})`);
      jugadorExistente.id = socket.id;
      jugadorExistente.name = finalUsername;
    } else {
      // Validar límite de 4 integrantes
      if (room.players.length >= 4) {
        const errorMsg = 'La sala ya está llena (máximo 4 jugadores).';
        socket.emit('room:error', { message: errorMsg });
        return;
      }

      // Agregar nuevo jugador
      room.players.push({
        id: socket.id,
        name: finalUsername,
        isReady: false
      });
    }

    socket.join(targetRoomId);
    console.log(`🎮 Jugador "${finalUsername}" (Total: ${room.players.length}/4) ingresó a la sala: ${targetRoomId}`);

    const successPayload = {
      roomId: targetRoomId,
      roomCode: targetRoomId,
      roomName: room.name
    };

    // Confirmación al cliente actual
    socket.emit('room:joined', successPayload);

    // 🔄 Emitir estado global actualizado a TODOS los navegadores conectados
    io.to(targetRoomId).emit('room:update', room);
  };

  // Escuchadores del evento de unión
  socket.on('room:join', handleJoinRoom);
  socket.on('unirse-sala', handleJoinRoom);

  // 3. CAMBIAR ESTADO "READY / PREPARADO" (Estudiantes)
  socket.on('room:toggle_ready', (data) => {
    const { roomId } = data || {};
    const room = rooms[roomId];

    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        // Transmitir la actualización en tiempo real
        io.to(roomId).emit('room:update', room);
      }
    }
  });

  // 4. INICIAR JUEGO (Solo invocado por el Profesor)
  socket.on('room:start', (data) => {
    const { roomId } = data || {};
    const room = rooms[roomId];

    if (room && room.hostId === socket.id) {
      console.log(`🏁 El profesor inició la partida en la sala ${roomId}`);

      io.to(roomId).emit('room:game_started', {
        roomId: roomId,
        message: '¡El juego ha comenzado!'
      });
    }
  });

  // 5. SALIR DE UNA SALA DE JUEGO
  socket.on('room:leave', (data) => {
    const { roomId } = data || {};
    if (!roomId || !rooms[roomId]) return;

    socket.leave(roomId);
    console.log(`🚪 Usuario ${socket.id} salió de la sala: ${roomId}`);

    const room = rooms[roomId];

    // Si el que se sale es el profesor, cerramos la sala
    if (room.hostId === socket.id) {
      const errorMsg = 'El profesor ha cerrado la sala.';
      io.to(roomId).emit('room:error', { message: errorMsg });
      delete rooms[roomId];
    } else {
      // Si es un alumno, lo removemos de la lista de jugadores
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('room:update', room);
    }
  });

  // 6. MANEJO DE DESCONEXIÓN INVOLUNTARIA
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      // Caso A: Si se desconecta el Profesor (Host)
      if (room.hostId === socket.id) {
        console.log(`⚠️ Profesor desconectado. Cerrando sala ${roomId}...`);
        const errorMsg = 'El profesor se ha desconectado. La sala fue cerrada.';
        io.to(roomId).emit('room:error', { message: errorMsg });
        delete rooms[roomId];
        break;
      }

      // Caso B: Si se desconecta un Estudiante
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        console.log(`⚠️ Estudiante desconectado (${socket.id}). Removiendo de la sala ${roomId}...`);
        room.players.splice(index, 1);
        io.to(roomId).emit('room:update', room);
        break;
      }
    }
  });

};