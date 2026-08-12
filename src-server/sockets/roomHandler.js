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
          if (decoded.role === 'teacher') {
            teacherId = decoded.id;
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

      // 💾 GUARDAR EN MARIADB (GroupRooms) CON LOS NOMBRES EXACTOS DE TU TABLA
      if (teacherId) {
        nuevaSalaDB = await GroupRoom.create({
          groupName: roomName || `Sala ${roomId}`, // Columna: groupName
          accessCode: roomId,                      // Columna: accessCode (código de 6 dígitos)
          teacherId: teacherId                     // Columna: teacherId
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
      
      // Si falla la BD, permitimos que la sala funcione en memoria o enviamos alerta
      socket.emit('room:error', {
        message: 'Ocurrió un problema al registrar la sala en la base de datos.'
      });
    }
  });

  // 2. UNIRSE A UNA SALA DE JUEGO (Estudiante)
  socket.on('room:join', (data) => {
    const { roomId, username } = data || {};
    if (!roomId) return;

    // Verificar si la sala existe
    if (!rooms[roomId]) {
      return socket.emit('room:error', {
        message: 'La sala especificada no existe o fue cerrada.'
      });
    }

    // Límite de 4 jugadores por sala
    if (rooms[roomId].players.length >= 4) {
      return socket.emit('room:error', {
        message: 'La sala ya está llena (máximo 4 jugadores).'
      });
    }

    socket.join(roomId);
    console.log(`🎮 Jugador ${username || socket.id} se unió a la sala: ${roomId}`);

    // Verificar si el jugador ya está en la lista para evitar duplicados
    const jugadorExiste = rooms[roomId].players.find(p => p.id === socket.id);
    if (!jugadorExiste) {
      rooms[roomId].players.push({
        id: socket.id,
        name: username || 'Estudiante',
        isReady: false
      });
    }

    // Confirmarle al estudiante que ingresó correctamente
    socket.emit('room:joined', {
      roomId,
      roomName: rooms[roomId].name
    });

    // 🔄 Emitir la lista actualizada a TODOS en la sala
    io.to(roomId).emit('room:update', rooms[roomId]);
  });

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
      io.to(roomId).emit('room:error', { message: 'El profesor ha cerrado la sala.' });
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
        io.to(roomId).emit('room:error', { message: 'El profesor se ha desconectado. La sala fue cerrada.' });
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