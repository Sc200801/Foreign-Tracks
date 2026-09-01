// public/src/js/podiumHandler.js 

function inicializarEscuchaPodio() {
  const socket = window.socket;

  // Si window.socket ya fue creado por room.js y está listo:
  if (socket) {
    console.log('🏆 Receptor del Podio conectado exitosamente a Socket.io.');
    
    // Desvincula escucha previa para evitar duplicados
    socket.off('game:over');
    
    // Escuchar la señal de fin de juego emitida desde roomHandler.js (Backend)
    socket.on('game:over', (data) => {
      console.log('🏆 Evento game:over recibido:', data);
      
      const { players } = data || {};

      if (players && Array.isArray(players)) {
        if (typeof window.mostrarPodio === 'function') {
          window.mostrarPodio(players);
        } else if (typeof mostrarPodio === 'function') {
          mostrarPodio(players);
        } else {
          console.error('❌ Error: La función mostrarPodio no está disponible en window.');
        }
      }
    });
  } else {
    // Si room.js aún no ha inicializado window.socket, reintenta en 300ms
    setTimeout(inicializarEscuchaPodio, 300);
  }
}

// Iniciar la escucha al cargar el archivo
inicializarEscuchaPodio();