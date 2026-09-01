// src/js/podiumHandler.js

// Verificar que exista la conexión del socket en el navegador
if (window.socket) {
  
  // Escuchar cuando el servidor notifica el fin del juego
  window.socket.on('game:over', (data) => {
    console.log('🏆 Evento game:over recibido:', data);
    
    const { players } = data || {};

    if (players && Array.isArray(players)) {
      // Si la función mostrarPodio de podium.js existe, la invocamos pasándole los datos reales
      if (typeof window.mostrarPodio === 'function') {
        window.mostrarPodio(players);
      } else if (typeof mostrarPodio === 'function') {
        mostrarPodio(players);
      } else {
        console.error('❌ Error: La función mostrarPodio no está disponible globalmente.');
      }
    }
  });

} else {
  console.warn('⚠️ window.socket no está definido aún al cargar socketClient.js');
}