const jwt = require('jsonwebtoken');
const { GroupRoom } = require('../models'); // Importamos el modelo de Sequelize

const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

// Almacén en memoria para guardar el estado de las salas activas en tiempo real
// Estructura: { roomId: { name, hostId, dbRoomId, players: [ { id, name, isReady, userId } ] } }
const rooms = {};

// Almacén para gestionar temporizadores de desconexión temporal (Grace Period)
const disconnectTimers = {};

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

      // Cancelar posible temporizador de desconexión del host si es una reconexión
      if (disconnectTimers[`host_${roomId}`]) {
        clearTimeout(disconnectTimers[`host_${roomId}`]);
        delete disconnectTimers[`host_${roomId}`];
        console.log(`🟢 Profesor reconectado. Se canceló la destrucción de la sala ${roomId}.`);
      }

      // Unir el socket del profesor a la sala de Socket.io
      socket.join(roomId);

      // Guardar o actualizar la sala en la memoria en tiempo real
      rooms[roomId] = rooms[roomId] || {
        name: roomName,
        roomId: roomId,
        dbRoomId: nuevaSalaDB ? nuevaSalaDB.id : null,
        hostId: socket.id,
        teacherId: teacherId,
        players: []
      };

      rooms[roomId].hostId = socket.id;

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

    // 🟢 BUSCAR NOMBRE EN MÚLTIPLES FUENTES
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

    // 🔍 BUSCAR SI EL JUGADOR YA ESTABA EN LA SALA (POR NOMBRE O POR SOCKET ID ANTERIOR)
    let jugadorExistente = room.players.find(p => p.id === socket.id);
    
    if (!jugadorExistente && finalUsername && !finalUsername.startsWith('Jugador-')) {
        jugadorExistente = room.players.find(p => p.name.toLowerCase() === finalUsername.toLowerCase());
    }

    if (jugadorExistente) {
      // 🔄 CANCELAR TIMEOUT DE ELIMINACIÓN SI ESTABA EN PERÍODO DE GRACIA
      const timerKey = `player_${targetRoomId}_${jugadorExistente.name}`;
      if (disconnectTimers[timerKey]) {
        clearTimeout(disconnectTimers[timerKey]);
        delete disconnectTimers[timerKey];
        console.log(`🟢 Reconexión exitosa dentro del tiempo de gracia: "${finalUsername}" conservó su lugar.`);
      } else {
        console.log(`🔄 Actualizando datos de conexión para "${finalUsername}" (Nuevo Socket ID: ${socket.id})`);
      }

      // Actualizar socket ID activo
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
    console.log(`🎮 Jugador "${finalUsername}" (Total: ${room.players.length}/4) activo en sala: ${targetRoomId}`);

    const successPayload = {
      roomId: targetRoomId,
      roomCode: targetRoomId,
      roomName: room.name
    };

    socket.emit('room:joined', successPayload);
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

  // 5. SALIR DE UNA SALA DE JUEGO (Salida Voluntaria)
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

  // 6. MANEJO DE DESCONEXIÓN INVOLUNTARIA (CON MARGEN DE GRACIA DE 10 SEGUNDOS)
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      // Caso A: Si se desconecta el Profesor (Host)
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
        }, 10000); // 10 segundos de espera

        break;
      }

      // Caso B: Si se desconecta un Estudiante
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        console.log(`⚠️ Estudiante "${player.name}" desconectado por micro-corte. Dando 10s para reconectarse...`);
        
        const playerTimerKey = `player_${roomId}_${player.name}`;
        if (disconnectTimers[playerTimerKey]) clearTimeout(disconnectTimers[playerTimerKey]);

        // Guardar temporizador de eliminación diferida
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
        }, 10000); // 10 segundos de margen de reconexión

        break;
      }
    }
  });

};