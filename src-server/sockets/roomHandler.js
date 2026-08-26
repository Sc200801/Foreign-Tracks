const jwt = require('jsonwebtoken');
const { GroupRoom } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

// Almacén en memoria para guardar el estado de las salas activas en tiempo real
const rooms = {};

// Almacén para gestionar temporizadores de desconexión temporal (Grace Period)
const disconnectTimers = {};

module.exports = (io, socket) => {

  // 1. CREAR SALA (Profesor / Host)
  socket.on('room:create', async (data) => {
    const { roomId, roomName, username } = data || {};

    if (!roomId) return;

    try {
      let teacherId = null;

      if (socket.user && (socket.user.id || socket.user.userId)) {
        teacherId = socket.user.id || socket.user.userId;
      }

      if (!teacherId) {
        const token = socket.handshake.auth?.token || 
                      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                      socket.handshake.query?.token;

        if (token) {
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const rawUser = decoded.user || decoded;
            teacherId = rawUser.id || rawUser.userId;
          } catch (tokenErr) {
            console.warn('⚠️ Token JWT no válido o expirado en room:create:', tokenErr.message);
          }
        }
      }

      console.log('\n===========================================');
      console.log('🚀 ¡SALA CREADA EN ROOMHANDLER.JS!');
      console.log(`👨‍🏫 Profesor (Host): ${username || 'Profesor'} (ID DB: ${teacherId || 'N/A'})`);
      console.log(`🏠 Sala: ${roomName}`);
      console.log(`🔑 Código ID: ${roomId}`);
      console.log('===========================================\n');

      let nuevaSalaDB = null;

      if (teacherId) {
        try {
          nuevaSalaDB = await GroupRoom.create({
            groupName: roomName || `Sala ${roomId}`,
            accessCode: roomId,
            teacherId: teacherId
          });
          console.log(`💾 Sala registrada en MariaDB exitosamente (ID Registro: ${nuevaSalaDB.id})`);
        } catch (dbErr) {
          console.error('❌ Error específico de Sequelize al insertar GroupRoom:', dbErr.message);
        }
      } else {
        console.warn('⚠️ No se pudo obtener el ID del docente desde el JWT. La sala funcionará solo en memoria.');
      }

      if (disconnectTimers[`host_${roomId}`]) {
        clearTimeout(disconnectTimers[`host_${roomId}`]);
        delete disconnectTimers[`host_${roomId}`];
        console.log(`🟢 Profesor reconectado. Se canceló la destrucción de la sala ${roomId}.`);
      }

      socket.join(roomId);

      rooms[roomId] = rooms[roomId] || {
        name: roomName,
        roomId: roomId,
        dbRoomId: nuevaSalaDB ? nuevaSalaDB.id : null,
        hostId: socket.id,
        teacherId: teacherId,
        players: []
      };

      rooms[roomId].hostId = socket.id;
      if (nuevaSalaDB) rooms[roomId].dbRoomId = nuevaSalaDB.id;

      socket.emit('room:created', {
        success: true,
        roomId,
        roomName,
        dbId: nuevaSalaDB ? nuevaSalaDB.id : null
      });

      io.to(roomId).emit('room:update', rooms[roomId]);

    } catch (error) {
      console.error('❌ Error al procesar room:create:', error);
      const errorMsg = 'Ocurrió un problema al registrar la sala en la base de datos.';
      socket.emit('room:error', { message: errorMsg });
    }
  });

// 2. UNIRSE A UNA SALA DE JUEGO (Estudiante)
  const handleJoinRoom = (data) => {
    const targetRoomId = data?.roomId || data?.roomCode;
    let username = data?.username;

    if (!targetRoomId) {
      return socket.emit('room:error', { message: 'Debes proporcionar un código de sala.' });
    }

    if (!rooms[targetRoomId]) {
      return socket.emit('room:error', { message: 'La sala especificada no existe o fue cerrada.' });
    }

    const room = rooms[targetRoomId];

    if (username && username !== 'Estudiante' && username !== 'Student') {
      username = username.trim();
    } else {
      username = null;
    }

    if (!username && socket.user) {
      username = socket.user.fullname || socket.user.username || socket.user.name;
    }

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

    const finalUsername = (username && username.trim().length > 0) 
      ? username.trim() 
      : `Jugador-${socket.id.slice(0, 4)}`;

    // PRIMERO: Buscar si el jugador YA EXISTE en la sala (por Socket ID o por Nombre)
    let jugadorExistente = room.players.find(p => p.id === socket.id || p.name.toLowerCase() === finalUsername.toLowerCase());

    if (jugadorExistente) {
      // Es una reconexión o recarga de página (F5)
      const timerKey = `player_${targetRoomId}_${jugadorExistente.name}`;
      if (disconnectTimers[timerKey]) {
        clearTimeout(disconnectTimers[timerKey]);
        delete disconnectTimers[timerKey];
      }

      console.log(`🔄 Reconectando a "${finalUsername}" (Nuevo Socket: ${socket.id}). Conserva isReady = ${jugadorExistente.isReady}`);
      jugadorExistente.id = socket.id; // Actualizar con el socket actual
    } else {
      // SI ES UN JUGADOR NUEVO: Validar cupo
      if (room.players.length >= 4) {
        return socket.emit('room:error', { message: 'La sala ya está llena (máximo 4 jugadores).' });
      }

      room.players.push({
        id: socket.id,
        name: finalUsername,
        isReady: false // Nuevo jugador entra como NO LISTO por defecto
      });
    }

    socket.join(targetRoomId);
    console.log(`🎮 Jugador "${finalUsername}" (Total: ${room.players.length}/4) activo en sala: ${targetRoomId}`);

    const successPayload = {
      roomId: targetRoomId,
      roomCode: targetRoomId,
      roomName: room.name
    };

    socket.emit('room:joined', successPayload);
    io.to(targetRoomId).emit('room:update', room);
  };

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
        io.to(roomId).emit('room:update', room);
      }
    }
  });

// 4. INICIAR JUEGO CON VALIDACIÓN RIGUROSA DE "READY"
  socket.on('room:start', (data) => {
    const { roomId } = data || {};
    const room = rooms[roomId];

    if (!room) {
      return socket.emit('room:error', { message: 'La sala no existe.' });
    }

    if (room.hostId !== socket.id) {
      return socket.emit('room:error', { message: 'Solo el profesor puede iniciar la partida.' });
    }

    if (!room.players || room.players.length === 0) {
      return socket.emit('room:error', { message: 'No hay estudiantes en la sala para iniciar el juego.' });
    }

    // Filtrar a cualquier jugador cuyo estado NO sea explícitamente true
    const sinPreparar = room.players.filter(p => p.isReady !== true);

    if (sinPreparar.length > 0) {
      const nombresPendientes = sinPreparar.map(p => p.name).join(', ');
      console.log(`⚠️ Intento de inicio bloqueado. Faltan por confirmar: ${nombresPendientes}`);
      return socket.emit('room:error', { 
        message: `No se puede iniciar. Aún hay alumnos sin confirmar listo: ${nombresPendientes}` 
      });
    }

    console.log(`🏁 Todos listos. El profesor inició la partida en la sala ${roomId}`);

    io.to(roomId).emit('room:game_started', {
      roomId: roomId,
      message: '¡El juego ha comenzado!'
    });
  });

  // 5. REGRESAR A LA SALA / LOBBY (SINCRONIZACIÓN FORZADA Y GLOBAL)
  socket.on('room:back_to_lobby', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;

    const room = rooms[roomId];

    console.log(`🔄 [ROOMHANDLER] Forzando regreso al lobby para la sala: ${roomId}`);

    // A) Notificar a toda la sala
    io.to(roomId).emit('room:returned_to_lobby', { roomId });

    // B) Notificar a TODOS los sockets conectados globalmente que tengan esa sala guardada
    if (room) {
      // Forzar a que todos los sockets involucrados vuelvan a unirse a la sala si se habían salido
      if (room.hostId) io.sockets.sockets.get(room.hostId)?.join(roomId);
      
      room.players.forEach(p => {
        const socketJugador = io.sockets.sockets.get(p.id);
        if (socketJugador) {
          socketJugador.join(roomId);
          socketJugador.emit('room:returned_to_lobby', { roomId });
        }
      });

      // Emitir el update con la lista de jugadores actualizada
      io.to(roomId).emit('room:update', room);
    }
  });

  // 6. SALIR DE UNA SALA DE JUEGO (Salida Voluntaria)
  socket.on('room:leave', (data) => {
    const { roomId } = data || {};
    if (!roomId || !rooms[roomId]) return;

    socket.leave(roomId);
    console.log(`🚪 Usuario ${socket.id} salió voluntariamente de la sala: ${roomId}`);

    const room = rooms[roomId];

    if (room.hostId === socket.id) {
      const errorMsg = 'El profesor ha cerrado la sala.';
      io.to(roomId).emit('room:error', { message: errorMsg });
      delete rooms[roomId];
    } else {
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('room:update', room);
    }
  });

  // 7. MANEJO DE DESCONEXIÓN INVOLUNTARIA (CON MARGEN DE GRACIA DE 10 SEGUNDOS)
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (room.hostId === socket.id) {
        console.log(`⚠️ Profesor desconectado temporalmente (Socket: ${socket.id}). Esperando 10s antes de cerrar sala...`);
        
        const hostTimerKey = `host_${roomId}`;
        if (disconnectTimers[hostTimerKey]) clearTimeout(disconnectTimers[hostTimerKey]);

        disconnectTimers[hostTimerKey] = setTimeout(() => {
          if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
            console.log(`❌ El profesor no regresó. Cerrando sala ${roomId}...`);
            io.to(roomId).emit('room:error', { message: 'El profesor se ha desconectado. La sala fue cerrada.' });
            delete rooms[roomId];
          }
          delete disconnectTimers[hostTimerKey];
        }, 10000);

        break;
      }

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        console.log(`⚠️ Estudiante "${player.name}" desconectado por micro-corte. Dando 10s para reconectarse...`);
        
        const playerTimerKey = `player_${roomId}_${player.name}`;
        if (disconnectTimers[playerTimerKey]) clearTimeout(disconnectTimers[playerTimerKey]);

        disconnectTimers[playerTimerKey] = setTimeout(() => {
          if (rooms[roomId]) {
            const index = rooms[roomId].players.findIndex(p => p.name === player.name && p.id === socket.id);
            if (index !== -1) {
              console.log(`❌ Estudiante "${player.name}" no se reconectó a tiempo. Removiendo de la sala ${roomId}.`);
              rooms[roomId].players.splice(index, 1);
              io.to(roomId).emit('room:update', rooms[roomId]);
            }
          }
          delete disconnectTimers[playerTimerKey];
        }, 10000);

        break;
      }
    }
  });

};