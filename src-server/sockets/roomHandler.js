const jwt = require('jsonwebtoken');
// Importamos los modelos
const { GroupRoom, GameSession } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

// Almacén en memoria para guardar el estado de las salas activas en tiempo real
const rooms = {};

// Almacén para gestionar temporizadores de desconexión temporal (Grace Period)
const disconnectTimers = {};

// ===================================================
// 🔐 MIDDLEWARE OPCIONAL DE AUTENTICACIÓN PARA SOCKET.IO
// ===================================================
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded.user || decoded.data || decoded;
      console.log(`🔑 Socket autenticado con éxito para usuario: ${socket.user.username || socket.user.id}`);
    } catch (err) {
      console.warn('⚠️ Token de Socket.io no válido o expirado en handshake:', err.message);
    }
  }
  next();
};

// ===================================================
// 🎮 LOGICA PRINCIPAL DE HANDLERS DE SALAS
// ===================================================
const roomHandler = (io, socket) => {

  // Decodificar token al momento de conectar el socket como respaldo
  const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (rawToken && !socket.user) {
    try {
      const decoded = jwt.verify(rawToken, JWT_SECRET);
      socket.user = decoded.user || decoded.data || decoded;
    } catch (e) {
      // Token inválido omitido silenciosamente
    }
  }

  // 1. CREAR SALA (Profesor / Host)
  socket.on('room:create', async (data) => {
    const { roomId, roomName, username } = data || {};

    if (!roomId) {
      return socket.emit('room:error', { message: 'El código de sala es requerido.' });
    }

    try {
      let teacherId = null;

      // 🔍 Extraer ID probando todas las propiedades habituales del payload JWT
      if (socket.user) {
        teacherId = socket.user.id || socket.user.userId || socket.user.id_user || socket.user.sub || null;
      }

      // Respaldo: Si vino en la data del evento
      if (!teacherId && data?.teacherId) {
        teacherId = data.teacherId;
      }

      console.log('\n===========================================');
      console.log('🚀 ¡SALA CREADA EN ROOMHANDLER.JS!');
      console.log(`👨‍🏫 Profesor (Host): ${username || socket.user?.fullname || 'Profesor'} (ID DB: ${teacherId || 'N/A'})`);
      console.log(`🏠 Sala: ${roomName}`);
      console.log(`🔑 Código ID: ${roomId}`);
      console.log('===========================================\n');

      let nuevaSalaDB = null;

      // 💾 GUARDAR O BUSCAR EN MARIADB (GroupRooms)
      if (GroupRoom) {
        try {
          // Intentar crear la sala en DB
          nuevaSalaDB = await GroupRoom.create({
            groupName: roomName || `Sala ${roomId}`,
            accessCode: String(roomId),
            teacherId: teacherId
          });
          console.log(`💾 Sala registrada en MariaDB exitosamente (ID Registro: ${nuevaSalaDB.id})`);
        } catch (dbErr) {
          // Si ya existe por el código de acceso, la buscamos
          try {
            nuevaSalaDB = await GroupRoom.findOne({ where: { accessCode: String(roomId) } });
            if (nuevaSalaDB) {
              console.log(`ℹ️ Sala existente recuperada de MariaDB (ID Registro: ${nuevaSalaDB.id})`);
            }
          } catch (findErr) {
            console.error('⚠️ Error al buscar/registrar en DB:', dbErr.message);
          }
        }
      }

      // Cancelar temporizador de desconexión del host si es reconexión
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
      rooms[roomId].teacherId = teacherId;
      if (nuevaSalaDB) {
        rooms[roomId].dbRoomId = nuevaSalaDB.id;
      }

      socket.emit('room:created', {
        success: true,
        roomId,
        roomName,
        dbId: nuevaSalaDB ? nuevaSalaDB.id : null
      });

      io.to(roomId).emit('room:update', rooms[roomId]);

    } catch (error) {
      console.error('❌ Error al procesar room:create:', error);
      socket.emit('room:error', { message: 'Ocurrió un problema al crear la sala.' });
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

    const finalUsername = (username && username.trim().length > 0) 
      ? username.trim() 
      : `Jugador-${socket.id.slice(0, 4)}`;

    let jugadorExistente = room.players.find(p => p.id === socket.id);
    
    if (!jugadorExistente && finalUsername && !finalUsername.startsWith('Jugador-')) {
        jugadorExistente = room.players.find(p => p.name.toLowerCase() === finalUsername.toLowerCase());
    }

    if (jugadorExistente) {
      const timerKey = `player_${targetRoomId}_${jugadorExistente.name}`;
      if (disconnectTimers[timerKey]) {
        clearTimeout(disconnectTimers[timerKey]);
        delete disconnectTimers[timerKey];
        console.log(`🟢 Reconexión exitosa dentro del tiempo de gracia: "${finalUsername}" conservó su lugar.`);
      }

      jugadorExistente.id = socket.id;
      jugadorExistente.name = finalUsername;
    } else {
      if (room.players.length >= 4) {
        return socket.emit('room:error', { message: 'La sala ya está llena (máximo 4 jugadores).' });
      }

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

  socket.on('room:join', handleJoinRoom);
  socket.on('unirse-sala', handleJoinRoom);

  // 3. CAMBIAR ESTADO "READY / PREPARADO"
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

  // 4. INICIAR JUEGO (Profesor)
  const handleStartGame = async (data) => {
    // 1. Buscar la sala donde este socket exacto es el Host (no depende del parámetro data del cliente)
    let roomCode = typeof data === 'string' ? data : (data?.roomId || data?.roomCode);
    let room = rooms[roomCode];

    if (!room) {
      const foundKey = Object.keys(rooms).find(key => rooms[key].hostId === socket.id);
      if (foundKey) {
        room = rooms[foundKey];
        roomCode = foundKey;
      }
    }

    if (room && room.hostId === socket.id) {
      console.log(`🏁 El profesor inició la partida en la sala: ${roomCode}`);

      try {
        let dbRoomId = room.dbRoomId;

        // 2. Si no tenemos el ID relacional en memoria, lo buscamos en MariaDB
        if (!dbRoomId && GroupRoom) {
          try {
            let salaDB = await GroupRoom.findOne({ 
              where: { accessCode: String(roomCode) },
              order: [['id', 'DESC']]
            });

            // Respaldo de seguridad: tomar la sala más reciente en la DB si la búsqueda falla
            if (!salaDB) {
              salaDB = await GroupRoom.findOne({ order: [['id', 'DESC']] });
            }

            if (salaDB) {
              dbRoomId = salaDB.id;
              room.dbRoomId = dbRoomId;
              console.log(`✅ Sala vinculada exitosamente. ID MariaDB: ${dbRoomId}`);
            }
          } catch (e) {
            console.error('⚠️ Error al consultar GroupRoom en MariaDB:', e.message);
          }
        }

        let teacherId = room.teacherId || (socket.user ? (socket.user.id || socket.user.userId || socket.user.id_user) : null);

        let nuevaSesionDB = null;

        // 3. Crear la sesión en MariaDB con el roomId correcto
        if (GameSession) {
          nuevaSesionDB = await GameSession.create({
            roomId: dbRoomId || null,
            playerId: teacherId || null,
            badgesEarned: 0,
            survivalHealth: 100.00,
            accumulatedEnglishScore: 0
          });
          
          console.log(`💾 Sesión creada con ÉXITO | GameSession ID: ${nuevaSesionDB.id} | roomId: ${dbRoomId}`);
        }

        if (nuevaSesionDB) {
          room.gameSessionId = nuevaSesionDB.id;
        }

        const payload = {
          roomId: roomCode,
          sessionId: nuevaSesionDB ? nuevaSesionDB.id : null,
          message: '¡El juego ha comenzado!'
        };

        io.to(roomCode).emit('room:game_started', payload);
        io.to(roomCode).emit('partida-iniciada', payload);

      } catch (error) {
        console.error('❌ Error al guardar GameSession en MariaDB:', error);
        socket.emit('room:error', { message: 'Ocurrió un error al registrar el inicio de la sesión de juego.' });
      }
    } else {
      console.warn(`⚠️ Intento no autorizado o sala no encontrada para el socket Host: ${socket.id}`);
    }
  };

  socket.on('room:start', handleStartGame);
  socket.on('iniciar-partida', handleStartGame);

  // 5. SALIR DE UNA SALA DE JUEGO
  socket.on('room:leave', (data) => {
    const { roomId } = data || {};
    if (!roomId || !rooms[roomId]) return;

    socket.leave(roomId);
    console.log(`🚪 Usuario ${socket.id} salió voluntariamente de la sala: ${roomId}`);

    const room = rooms[roomId];

    if (room.hostId === socket.id) {
      io.to(roomId).emit('room:error', { message: 'El profesor ha cerrado la sala.' });
      delete rooms[roomId];
    } else {
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(roomId).emit('room:update', room);
    }
  });

  // 6. MANEJO DE DESCONEXIÓN INVOLUNTARIA
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (room.hostId === socket.id) {
        console.log(`⚠️ Profesor desconectado temporalmente. Esperando 10s...`);
        
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
        console.log(`⚠️ Estudiante "${player.name}" desconectado. Esperando 10s...`);
        
        const playerTimerKey = `player_${roomId}_${player.name}`;
        if (disconnectTimers[playerTimerKey]) clearTimeout(disconnectTimers[playerTimerKey]);

        disconnectTimers[playerTimerKey] = setTimeout(() => {
          if (rooms[roomId]) {
            const index = rooms[roomId].players.findIndex(p => p.name === player.name && p.id === socket.id);
            if (index !== -1) {
              console.log(`❌ Estudiante "${player.name}" removido por inactividad.`);
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

module.exports = roomHandler;
module.exports.authenticateSocket = authenticateSocket;