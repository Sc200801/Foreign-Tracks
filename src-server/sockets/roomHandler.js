const jwt = require('jsonwebtoken');
const { GroupRoom, RoomPlayer, Player, Scenario, DialogueNode, GameSession } = require('../models');
const { sequelize } = require('../config/db'); // 👈 Importado para operaciones acumulativas (sequelize.literal)

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
      return socket.emit('room:error', { message: errorMsg });
    }
  });

  // 2. UNIRSE A UNA SALA DE JUEGO (Estudiante)
  const handleJoinRoom = async (data) => {

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

    let studentId = null;

    if (socket.user) {
      username = username || socket.user.fullname || socket.user.username || socket.user.name;
      studentId = socket.user.id || socket.user.userId;
    }

    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const raw = decoded.user || decoded.data || decoded;
        if (!username) username = raw.fullname || raw.username || raw.name || raw.nombre;
        if (!studentId) studentId = raw.id || raw.userId;
      } catch (e) {
        console.warn('⚠️ No se pudo decodificar el token JWT al unirse a la sala:', e.message);
      }
    }

    const finalUsername = (username && username.trim().length > 0) 
      ? username.trim() 
      : `Jugador-${socket.id.slice(0, 4)}`;

    let jugadorExistente = room.players.find(p => p.id === socket.id || p.name.toLowerCase() === finalUsername.toLowerCase());

    if (jugadorExistente) {
      const timerKey = `player_${targetRoomId}_${jugadorExistente.name}`;
      if (disconnectTimers[timerKey]) {
        clearTimeout(disconnectTimers[timerKey]);
        delete disconnectTimers[timerKey];
      }

      console.log(`🔄 Reconectando a "${finalUsername}" (Nuevo Socket: ${socket.id}). Conserva isReady = ${jugadorExistente.isReady}`);
      jugadorExistente.id = socket.id;
    } else {
      if (room.players.length >= 4) {
        return socket.emit('room:error', { message: 'La sala ya está llena (máximo 4 jugadores).' });
      }

      if (room.dbRoomId && studentId) {
        try {
          const [roomPlayerRecord, created] = await RoomPlayer.findOrCreate({
            where: {
              roomId: room.dbRoomId,
              playerId: studentId
            },
            defaults: {
              groupRole: 'member'
            }
          });

          if (created) {
            console.log(`💾 Estudiante ID ${studentId} registrado en RoomPlayer (ID Registro: ${roomPlayerRecord.id}) para la sala DB ${room.dbRoomId}`);
          } else {
            console.log(`ℹ️ Registro de estudiante ID ${studentId} ya existía en RoomPlayer para la sala DB ${room.dbRoomId}`);
          }
        } catch (dbErr) {
          console.error('❌ Error al registrar RoomPlayer en MariaDB:', dbErr.message);
        }
      } else {
        console.warn('⚠️ Se omitió el guardado en RoomPlayer: falta dbRoomId o el ID del estudiante.');
      }

      room.players.push({
        id: socket.id,
        dbPlayerId: studentId || null,
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

  // Se asegura de desacoplar listener previo si existía en la instancia de este socket
  socket.removeAllListeners('room:join');
  socket.on('room:join', handleJoinRoom);

  // 3. CAMBIAR ESTADO "READY / PREPARADO" (Estudiantes)
  socket.removeAllListeners('room:toggle_ready');
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

  // 4. INICIAR JUEGO CON CREACIÓN DE GAME SESSIONS Y ASIGNACIÓN DE TURNOS
  socket.removeAllListeners('room:start');
  socket.on('room:start', async (data) => {

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

    try {
      let roomPlayers = [];
      
      if (room.dbRoomId) {
        try {
          roomPlayers = await RoomPlayer.findAll({
            where: { roomId: room.dbRoomId },
            order: [['createdAt', 'ASC']],
            include: [{ model: Player, attributes: ['id', 'username', 'fullname'] }]
          });
        } catch (errDbFetch) {
          console.warn('⚠️ No se pudieron obtener los RoomPlayers de la BD, utilizando datos de memoria:', errDbFetch.message);
        }
      }

      const hotelScenario = await Scenario.findOne({
        where: { name: 'Hotel' },
        include: [
          {
            model: DialogueNode,
            order: [['stepIndex', 'ASC']]
          }
        ]
      });

      if (!hotelScenario || !hotelScenario.DialogueNodes || !hotelScenario.DialogueNodes.length) {
        return socket.emit('room:error', { message: 'No se encontraron diálogos para el escenario Hotel.' });
      }

      const firstDialogue = hotelScenario.DialogueNodes[0];

      // 💾 CREACIÓN LIMPIA Y ESTRATÉGICA EN GameSessions
      const createdSessions = [];
      const idSalaDB = room.dbRoomId || null;

      // Determinamos los jugadores a registrar (priorizando MariaDB y usando memoria como respaldo)
      const listaJugadores = roomPlayers.length > 0 
        ? roomPlayers.map(rp => ({ playerId: rp.playerId, name: rp.Player?.fullname || rp.Player?.username }))
        : room.players.map(p => ({ playerId: p.dbPlayerId, name: p.name }));

      if (idSalaDB) {
        for (const playerItem of listaJugadores) {
          if (playerItem.playerId) {
            try {
              const [session] = await GameSession.findOrCreate({
                where: {
                  roomId: idSalaDB,
                  playerId: playerItem.playerId
                },
                defaults: {
                  roomId: idSalaDB,
                  playerId: playerItem.playerId,
                  currentScenarioId: hotelScenario.id,
                  endingId: null
                }
              });
              createdSessions.push(session);
            } catch (sessionErr) {
              console.error(`❌ Error al crear GameSession para el jugador ID ${playerItem.playerId}:`, sessionErr.message);
            }
          }
        }
        console.log(`💾 Se crearon/verificaron ${createdSessions.length} registros en GameSessions.`);
      } else {
        console.warn('⚠️ No se creó registro en GameSessions debido a que la sala no posee dbRoomId.');
      }

      const turnAssignment = (roomPlayers.length > 0 ? roomPlayers : room.players).map((p, index) => ({
        turnOrder: index + 1,
        playerId: p.playerId || p.dbPlayerId || p.id,
        playerInfo: p.Player || { username: p.name, fullname: p.name }
      }));

      const activeTurn = turnAssignment.find(t => t.turnOrder === firstDialogue.targetPlayer) || turnAssignment[0];

      console.log(`🏁 Todos listos. El profesor inició la partida en la sala ${roomId}`);

      io.to(roomId).emit('room:game_started', {
        roomId: roomId,
        message: '¡El juego ha comenzado!',
        turns: turnAssignment,
        activePlayerId: activeTurn ? activeTurn.playerId : null,
        dialogue: {
          id: firstDialogue.id,
          stepIndex: firstDialogue.stepIndex,
          situationTextEn: firstDialogue.situationTextEn,
          correctAnswerPattern: firstDialogue.correctAnswerPattern,
          wrongAnswer: firstDialogue.wrongAnswer,
          targetPlayer: firstDialogue.targetPlayer
        }
      });

    } catch (error) {
      console.error('❌ Error al iniciar partida en room:start:', error);
      return socket.emit('room:error', { message: 'Ocurrió un error al procesar el inicio en la base de datos.' });
    }
  });

  // 4.1 SUBMIT DE RESPUESTA EN DIÁLOGO (Validación, Puntos, Vida Grupal y Avance)
  socket.removeAllListeners('dialogue:submit_answer');
  socket.on('dialogue:submit_answer', async (data) => {
    const { roomId, dialogueId, selectedAnswer } = data || {};

    if (!roomId || !dialogueId || !selectedAnswer) {
      return socket.emit('room:error', { message: 'Faltan parámetros requeridos para procesar la respuesta.' });
    }

    const room = rooms[roomId];
    if (!room) {
      return socket.emit('room:error', { message: 'La sala especificada no existe.' });
    }

    try {
      // 1. Obtener el nodo de diálogo actual
      const currentDialogue = await DialogueNode.findByPk(dialogueId);
      if (!currentDialogue) {
        return socket.emit('room:error', { message: 'No se encontró el nodo de diálogo.' });
      }

      // 2. Normalizar y comparar la respuesta elegida con la correcta
      const isCorrect = selectedAnswer.trim().toLowerCase() === currentDialogue.correctAnswerPattern.trim().toLowerCase();

      // 3. Identificar al jugador que respondió (a través de socket.id o JWT)
      let playerInRoom = room.players.find(p => p.id === socket.id);
      let studentId = playerInRoom ? playerInRoom.dbPlayerId : null;

      if (!studentId && socket.user) {
        studentId = socket.user.id || socket.user.userId;
      }

      if (isCorrect) {
        // --- CASO RESPUESTA CORRECTA ---
        if (room.dbRoomId && studentId) {
          await GameSession.update(
            { accumulatedEnglishScore: sequelize.literal('accumulatedEnglishScore + 10') },
            { where: { roomId: room.dbRoomId, playerId: studentId } }
          );
        }

        const nextStepIndex = currentDialogue.stepIndex + 1;
        const nextDialogue = await DialogueNode.findOne({
          where: {
            scenarioId: currentDialogue.scenarioId,
            stepIndex: nextStepIndex
          }
        });

        if (nextDialogue) {
          let roomPlayers = [];
          if (room.dbRoomId) {
            roomPlayers = await RoomPlayer.findAll({
              where: { roomId: room.dbRoomId },
              order: [['createdAt', 'ASC']],
              include: [{ model: Player, attributes: ['id', 'username', 'fullname'] }]
            });
          }

          const turnAssignment = (roomPlayers.length > 0 ? roomPlayers : room.players).map((p, index) => ({
            turnOrder: index + 1,
            playerId: p.playerId || p.dbPlayerId || p.id,
            playerInfo: p.Player || { username: p.name, fullname: p.name }
          }));

          const activeTurn = turnAssignment.find(t => t.turnOrder === nextDialogue.targetPlayer) || turnAssignment[0];

          io.to(roomId).emit('dialogue:success', {
            message: '¡Respuesta correcta!',
            nextDialogue: {
              id: nextDialogue.id,
              stepIndex: nextDialogue.stepIndex,
              situationTextEn: nextDialogue.situationTextEn,
              correctAnswerPattern: nextDialogue.correctAnswerPattern,
              wrongAnswer: nextDialogue.wrongAnswer,
              targetPlayer: nextDialogue.targetPlayer
            },
            activePlayerId: activeTurn ? activeTurn.playerId : null,
            turns: turnAssignment
          });
        } else {
          io.to(roomId).emit('scenario:completed', {
            message: '¡Felicidades! Han completado el escenario con éxito.'
          });
        }

      } else {
        // --- CASO RESPUESTA INCORRECTA ---
        const DAMAGE = 20.00;

        if (room.dbRoomId) {
          await GameSession.update(
            { survivalHealth: sequelize.literal(`GREATEST(0, survivalHealth - ${DAMAGE})`) },
            { where: { roomId: room.dbRoomId } }
          );
        }

        let currentHealth = 100 - DAMAGE;
        if (room.dbRoomId) {
          const sampleSession = await GameSession.findOne({
            where: { roomId: room.dbRoomId }
          });
          if (sampleSession) {
            currentHealth = sampleSession.survivalHealth;
          }
        }

        let parsedFeedback = null;
        if (currentDialogue.feedbackText) {
          try {
            parsedFeedback = JSON.parse(currentDialogue.feedbackText);
          } catch (e) {
            parsedFeedback = currentDialogue.feedbackText;
          }
        }

        io.to(roomId).emit('dialogue:error', {
          message: 'Respuesta incorrecta. La vida del grupo ha disminuido.',
          damageTaken: DAMAGE,
          remainingHealth: currentHealth,
          feedback: parsedFeedback,
          dialogueId: currentDialogue.id
        });
      }

    } catch (error) {
      console.error('❌ Error al procesar dialogue:submit_answer:', error);
      return socket.emit('room:error', { message: 'Error interno al validar la respuesta.' });
    }
  });

  // 5. REGRESAR A LA SALA / LOBBY
  socket.removeAllListeners('room:back_to_lobby');
  socket.on('room:back_to_lobby', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;

    const room = rooms[roomId];

    console.log(`🔄 [ROOMHANDLER] Forzando regreso al lobby para la sala: ${roomId}`);

    io.to(roomId).emit('room:returned_to_lobby', { roomId });

    if (room) {
      if (room.hostId) io.sockets.sockets.get(room.hostId)?.join(roomId);
      
      room.players.forEach(p => {
        const socketJugador = io.sockets.sockets.get(p.id);
        if (socketJugador) {
          socketJugador.join(roomId);
          socketJugador.emit('room:returned_to_lobby', { roomId });
        }
      });

      io.to(roomId).emit('room:update', room);
    }
  });

  // 6. SALIR DE UNA SALA DE JUEGO (Salida Voluntaria)
  socket.removeAllListeners('room:leave');
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

  // 7. GESTIÓN DEL CHAT MULTIJUGADOR Y MÉTRICA DE PARTICIPACIÓN
  socket.removeAllListeners('enviar-mensaje-chat');
  socket.on('enviar-mensaje-chat', (data) => {
    const { roomId, usuario, mensaje, palabrasContadas, totalAcumulado, timestamp } = data || {};

    if (!mensaje) return;

    let senderName = usuario;
    if (!senderName && socket.user) {
      senderName = socket.user.fullname || socket.user.name || socket.user.username;
    }
    if (!senderName && roomId && rooms[roomId]) {
      const p = rooms[roomId].players.find(player => player.id === socket.id);
      if (p) senderName = p.name;
    }
    senderName = senderName || 'Estudiante';

    const responsePayload = {
      usuario: senderName,
      mensaje: mensaje,
      palabrasContadas: palabrasContadas || 0,
      totalAcumulado: totalAcumulado || 0,
      timestamp: timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      socketId: socket.id
    };

    if (roomId) {
      io.to(roomId).emit('mensaje-chat-recibido', responsePayload);
    } else {
      io.emit('mensaje-chat-recibido', responsePayload);
    }
  });

  // 8. MANEJO DE DESCONEXIÓN INVOLUNTARIA (CON MARGEN DE GRACIA DE 10 SEGUNDOS)
  socket.removeAllListeners('disconnect');
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