// src-server/sockets/roomHandler.js

module.exports = (io, socket) => {
  // Unirse a una sala de juego
  socket.on('room:join', (data) => {
    const { roomId, username } = data || {};
    
    if (!roomId) return;

    socket.join(roomId);
    console.log(`🎮 Jugador ${username || socket.id} se unió a la sala: ${roomId}`);

    // Notificar a los miembros de la sala
    io.to(roomId).emit('room:joined', {
      message: `El jugador ${username || socket.id} se ha unido a la sala.`,
      roomId,
      socketId: socket.id
    });
  });

  // Salir de una sala de juego
  socket.on('room:leave', (data) => {
    const { roomId } = data || {};
    if (!roomId) return;

    socket.leave(roomId);
    console.log(`🚪 Jugador ${socket.id} salió de la sala: ${roomId}`);

    socket.to(roomId).emit('room:left', {
      message: `Un jugador ha abandonado la sala.`,
      socketId: socket.id
    });
  });
};