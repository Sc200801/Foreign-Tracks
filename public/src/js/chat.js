document.addEventListener('DOMContentLoaded', () => {
  // 1. Selección de elementos del DOM
  const chatModal = document.getElementById('chat-modal');
  const chatToggleBtn = document.getElementById('chat-toggle-btn');
  const chatCloseBtn = document.getElementById('chat-close-btn');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');

  if (!chatForm || !chatInput || !chatMessages) return;

  // Expone la función global para mostrar la burbuja desde Phaser
  window.mostrarChatUI = function() {
    if (chatToggleBtn) {
      chatToggleBtn.classList.remove('oculto');
    }
  };

  // Paleta de colores estilo Pixel Art (Tonos oscuros para que resalte el texto blanco/dorado)
  const coloresAlumnos = [
    { bg: '#1e293b', border: '#38bdf8', text: '#7dd3fc' }, // Azul Cyand
    { bg: '#2e1065', border: '#c084fc', text: '#e9d5ff' }, // Morado
    { bg: '#064e3b', border: '#34d399', text: '#a7f3d0' }, // Verde Esmeralda
    { bg: '#701a75', border: '#f472b6', text: '#fbcfe8' }, // Rosa Magenta
    { bg: '#7c2d12', border: '#fb923c', text: '#ffedd5' }, // Naranja
    { bg: '#183fa2', border: '#7a99e9', text: '#b5b8f5' }, // azul
  ];

  // Algoritmo Hash para asignar siempre el mismo color al mismo nombre
  function obtenerColorPorNombre(nombre) {
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % coloresAlumnos.length;
    return coloresAlumnos[index];
  }

  // Estado local
  let totalPalabrasEnviadas = 0;

  // Determinar la etiqueta del usuario local
  const obtenerEtiquetaUsuario = () => {
    const role = (localStorage.getItem('role') || localStorage.getItem('userRole') || localStorage.getItem('tipoUsuario') || '').toLowerCase();
    const esProfe = role === 'profesor' || role === 'docente' || role === 'teacher';

    const nombreGuardado = localStorage.getItem('nombreJugador') 
                        || localStorage.getItem('username') 
                        || localStorage.getItem('usuario');

    if (esProfe) {
      if (nombreGuardado && nombreGuardado.toLowerCase() !== 'docente' && nombreGuardado.toLowerCase() !== 'profesor') {
        return `Teacher: ${nombreGuardado}`;
      }
      return 'Teacher';
    }

    return nombreGuardado || 'Jugador';
  };

  // 2. Lógica para Abrir y Cerrar Ventana
  if (chatToggleBtn && chatModal) {
    chatToggleBtn.addEventListener('click', () => {
      chatModal.classList.toggle('oculto');
      if (!chatModal.classList.contains('oculto')) {
        chatInput.focus();
      }
    });
  }

  if (chatCloseBtn && chatModal) {
    chatCloseBtn.addEventListener('click', () => {
      chatModal.classList.add('oculto');
    });
  }

  // 3. Control de Foco en Phaser
  chatInput.addEventListener('focus', () => {
    if (window.game && window.game.input && window.game.input.keyboard) {
      window.game.input.keyboard.enabled = false;
    }
  });

  chatInput.addEventListener('blur', () => {
    if (window.game && window.game.input && window.game.input.keyboard) {
      window.game.input.keyboard.enabled = true;
    }
  });

  // 4. Envío de mensajes a través de Socket.io
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const texto = chatInput.value.trim();
    if (!texto) return;

    const palabras = texto.split(/\s+/).filter(word => word.length > 0);
    totalPalabrasEnviadas += palabras.length;

    const miUsuario = obtenerEtiquetaUsuario();
    const roomIdActual = localStorage.getItem('codigoSala') || window.currentRoomId;

    const payload = {
      socketId: window.socket ? window.socket.id : 'local',
      roomId: roomIdActual,
      usuario: miUsuario,
      mensaje: texto,
      palabrasContadas: palabras.length,
      totalAcumulado: totalPalabrasEnviadas,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (window.socket) {
      window.socket.emit('enviar-mensaje-chat', payload);
    } else {
      renderizarMensaje(payload);
    }

    chatInput.value = '';
  });

  // 5. Escuchar mensajes entrantes del servidor
  if (window.socket) {
    window.socket.off('mensaje-chat-recibido');
    window.socket.on('mensaje-chat-recibido', (data) => {
      renderizarMensaje(data);
    });
  }

  // 6. Renderizado en el DOM con colores personalizados por estudiante
  function renderizarMensaje(data) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message');

    const miEtiquetaLocal = obtenerEtiquetaUsuario();
    let emisor = data.usuario || data.sender || '';

    // Verificar si el mensaje proviene del usuario local
    const esMio = (data.socketId && window.socket && data.socketId === window.socket.id) 
               || (emisor !== '' && emisor === miEtiquetaLocal);

    // Detección de genéricos para convertir en Teacher si no es mio
    if (!esMio) {
      const emisorLower = emisor.toLowerCase();
      if (!emisor || emisorLower === 'jugador' || emisorLower === 'student' || emisorLower === 'docente' || emisorLower === 'profesor') {
        emisor = 'Teacher';
      }
    }

    const esDocente = emisor.startsWith('Teacher') 
                   || emisor.toLowerCase().includes('docente') 
                   || emisor.toLowerCase().includes('profesor')
                   || (esMio && miEtiquetaLocal.startsWith('Teacher'));

    if (esMio) {
      msgDiv.classList.add('mio');
    } else {
      msgDiv.classList.add('otro');
    }

    // Aplicar estilos según el tipo de usuario
    if (esDocente) {
      msgDiv.classList.add('es-profesor');
      if (!emisor.startsWith('Teacher')) {
        emisor = `Teacher: ${emisor}`;
      }
    } else if (!esMio) {
      // Si es otro estudiante, le asignamos su color dinámico
      const estiloColor = obtenerColorPorNombre(emisor);
      msgDiv.style.backgroundColor = estiloColor.bg;
      msgDiv.style.borderColor = estiloColor.border;
    }

    const spanUser = document.createElement('span');
    spanUser.classList.add('username');

    if (esMio) {
      spanUser.textContent = esDocente ? 'Tú (Teacher):' : 'Tú:';
    } else {
      spanUser.textContent = `${emisor}:`;
      if (!esDocente) {
        const estiloColor = obtenerColorPorNombre(emisor);
        spanUser.style.color = estiloColor.text;
      }
    }

    const spanText = document.createElement('span');
    spanText.classList.add('text');
    spanText.textContent = ` ${data.mensaje || data.text}`;

    msgDiv.appendChild(spanUser);
    msgDiv.appendChild(spanText);

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});